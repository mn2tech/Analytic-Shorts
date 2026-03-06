#!/usr/bin/env python3
"""Analytics worker - executes spec (summary/freq) on pandas, outputs JSON."""
import argparse
import json
import sys

def _flatten_col(c):
    if isinstance(c, tuple):
        return '_'.join(str(x) for x in c if str(x))
    return str(c).replace('(', '_').replace(')', '').replace("'", '')

def run_summary(df, spec):
    import pandas as pd
    group_by = spec.get('group_by') or []
    metrics = spec.get('metrics') or [{'col': '*', 'agg': ['mean', 'sum', 'count', 'min', 'max']}]
    agg_map = {'mean': 'mean', 'sum': 'sum', 'count': 'count', 'min': 'min', 'max': 'max'}
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    aggs = {}
    for m in metrics:
        col = m.get('col')
        if col == '*':
            cols = numeric_cols
        else:
            if col not in df.columns:
                raise ValueError(f"Column '{col}' not found")
            cols = [col]
        for a in m.get('agg') or []:
            pandas_agg = agg_map.get(a)
            if pandas_agg:
                for c in cols:
                    aggs[c] = aggs.get(c, []) + [pandas_agg]
    if not aggs:
        aggs = {c: ['mean', 'sum', 'count'] for c in numeric_cols}
    if group_by:
        out = df.groupby(group_by, dropna=False).agg(aggs).reset_index()
    else:
        out = df.agg(aggs).reset_index()
    def _flat(c):
        return '_'.join(str(x) for x in c) if isinstance(c, tuple) else str(c)
    out.columns = [_flat(c) for c in out.columns]
    return {'records': out.to_dict(orient='records'), 'tokens_used': 0}

def run_freq(df, spec):
    import pandas as pd
    columns = spec.get('columns') or []
    outputs = []
    for col in columns:
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found")
        vc = df[col].value_counts(dropna=False)
        total = len(df)
        records = [{'value': str(k), 'count': int(v), 'percent': round(100 * v / total, 2)} for k, v in vc.items()]
        outputs.append({'name': f'freq_{col}', 'column': col, 'records': records})
    return {'outputs': outputs, 'tokens_used': 0}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', required=True)
    parser.add_argument('--data', required=True)
    args = parser.parse_args()
    spec = json.loads(args.spec)
    with open(args.data) as f:
        data = json.load(f)
    import pandas as pd
    df = pd.DataFrame(data)
    tasks = spec.get('tasks') or [spec]
    all_outputs = []
    all_records = []
    for t in tasks:
        task = t.get('task') or 'summary'
        if task == 'summary':
            r = run_summary(df, t)
            all_records.extend(r.get('records') or [])
        elif task == 'freq':
            r = run_freq(df, t)
            all_outputs.extend(r.get('outputs') or [])
        else:
            raise ValueError(f"Unknown task: {task}")
    result = {}
    if all_outputs:
        result['outputs'] = all_outputs
    if all_records:
        result['records'] = all_records
    if not result:
        result = {'records': [], 'outputs': [], 'tokens_used': 1}
    result['tokens_used'] = max(1, result.get('tokens_used', 0))
    print(json.dumps(result))

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(json.dumps({'error': str(e), 'records': [], 'outputs': [], 'tokens_used': 0}), file=sys.stderr)
        sys.exit(1)

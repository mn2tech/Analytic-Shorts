# Sample SAS data

This folder can hold sample SAS files for the **sas7bdat-sample** example in Studio.

- **sample.sas7bdat** (optional): If present, the Studio dataset "sas7bdat-sample" loads from this file. If missing, it falls back to built-in sales data.
- **sample.xpt** (optional): SAS XPORT format; the script below generates this. The app accepts .xpt uploads the same way as .sas7bdat.

## Generate sample.xpt (SAS XPORT)

pyreadstat **cannot write** native `.sas7bdat`; it can only write SAS XPORT (`.xpt`). To create a sample `.xpt` file:

1. Install: `pip install pyreadstat pandas`
2. From the project root run:
   ```bash
   python backend/scripts/generate_sample_sas7bdat.py
   ```
   This reads `sample-data.csv` and writes `backend/sample-data/sample.xpt`. You can upload this file in the app to try SAS data.

## Native .sas7bdat sample

To use a **native** `.sas7bdat` file: create one with SAS or another tool, or copy any small `.sas7bdat` into this folder and name it `sample.sas7bdat`. Then the sas7bdat-sample dataset will load from it.

const express = require('express')
const axios = require('axios')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')

const router = express.Router()

// Helper function to process data while preserving numeric values
function processDataPreservingNumbers(data, numericColumns) {
  return data.map((row) => {
    const processed = {}
    Object.keys(row).forEach((key) => {
      const value = row[key]
      // Preserve numeric values for numeric columns
      if (numericColumns.includes(key) && typeof value === 'number') {
        processed[key] = value
      } else if (value === null || value === undefined) {
        processed[key] = ''
      } else {
        processed[key] = String(value).trim()
      }
    })
    return processed
  })
}

// Example datasets
const exampleDatasets = {
  sales: {
    data: [
      { Date: '2024-01-01', Product: 'Laptop', Category: 'Electronics', Sales: 12500, Region: 'North', Units: 25 },
      { Date: '2024-01-02', Product: 'Mouse', Category: 'Electronics', Sales: 1500, Region: 'North', Units: 150 },
      { Date: '2024-01-03', Product: 'Desk', Category: 'Furniture', Sales: 4500, Region: 'South', Units: 15 },
      { Date: '2024-01-04', Product: 'Chair', Category: 'Furniture', Sales: 3200, Region: 'South', Units: 20 },
      { Date: '2024-01-05', Product: 'Monitor', Category: 'Electronics', Sales: 8500, Region: 'East', Units: 17 },
      { Date: '2024-01-06', Product: 'Keyboard', Category: 'Electronics', Sales: 2400, Region: 'West', Units: 80 },
      { Date: '2024-01-07', Product: 'Table', Category: 'Furniture', Sales: 5600, Region: 'North', Units: 14 },
      { Date: '2024-01-08', Product: 'Laptop', Category: 'Electronics', Sales: 13200, Region: 'East', Units: 26 },
      { Date: '2024-01-09', Product: 'Mouse', Category: 'Electronics', Sales: 1800, Region: 'West', Units: 180 },
      { Date: '2024-01-10', Product: 'Desk', Category: 'Furniture', Sales: 4800, Region: 'North', Units: 16 },
      { Date: '2024-01-11', Product: 'Chair', Category: 'Furniture', Sales: 3400, Region: 'South', Units: 21 },
      { Date: '2024-01-12', Product: 'Monitor', Category: 'Electronics', Sales: 9200, Region: 'East', Units: 18 },
      { Date: '2024-01-13', Product: 'Keyboard', Category: 'Electronics', Sales: 2600, Region: 'West', Units: 85 },
      { Date: '2024-01-14', Product: 'Table', Category: 'Furniture', Sales: 5800, Region: 'South', Units: 15 },
      { Date: '2024-01-15', Product: 'Laptop', Category: 'Electronics', Sales: 14000, Region: 'North', Units: 28 },
      { Date: '2024-01-16', Product: 'Mouse', Category: 'Electronics', Sales: 1600, Region: 'East', Units: 160 },
      { Date: '2024-01-17', Product: 'Desk', Category: 'Furniture', Sales: 5000, Region: 'West', Units: 17 },
      { Date: '2024-01-18', Product: 'Chair', Category: 'Furniture', Sales: 3600, Region: 'North', Units: 22 },
      { Date: '2024-01-19', Product: 'Monitor', Category: 'Electronics', Sales: 9800, Region: 'South', Units: 19 },
      { Date: '2024-01-20', Product: 'Keyboard', Category: 'Electronics', Sales: 2800, Region: 'East', Units: 90 },
    ],
  },
  attendance: {
    data: [
      { Date: '2024-01-01', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-01', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-01', Employee: 'Bob Johnson', Department: 'Sales', Hours: 7.5, Status: 'Present' },
      { Date: '2024-01-02', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-02', Employee: 'Jane Smith', Department: 'Marketing', Hours: 0, Status: 'Absent' },
      { Date: '2024-01-02', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'Bob Johnson', Department: 'Sales', Hours: 6, Status: 'Late' },
      { Date: '2024-01-04', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-04', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-04', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-05', Employee: 'John Doe', Department: 'Engineering', Hours: 4, Status: 'Half Day' },
      { Date: '2024-01-05', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-05', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'Bob Johnson', Department: 'Sales', Hours: 7, Status: 'Present' },
      { Date: '2024-01-09', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-09', Employee: 'Jane Smith', Department: 'Marketing', Hours: 0, Status: 'Absent' },
      { Date: '2024-01-09', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
    ],
  },
  donations: {
    data: [
      { Date: '2024-01-01', Donor: 'Alice Brown', Category: 'Education', Amount: 500, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-02', Donor: 'Charlie Davis', Category: 'Healthcare', Amount: 1000, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-03', Donor: 'Eve Wilson', Category: 'Environment', Amount: 250, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-04', Donor: 'Frank Miller', Category: 'Education', Amount: 750, PaymentMethod: 'PayPal' },
      { Date: '2024-01-05', Donor: 'Grace Lee', Category: 'Healthcare', Amount: 2000, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-06', Donor: 'Henry Taylor', Category: 'Environment', Amount: 300, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-07', Donor: 'Ivy Chen', Category: 'Education', Amount: 600, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-08', Donor: 'Jack Anderson', Category: 'Healthcare', Amount: 1500, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-09', Donor: 'Karen White', Category: 'Environment', Amount: 400, PaymentMethod: 'PayPal' },
      { Date: '2024-01-10', Donor: 'Liam Garcia', Category: 'Education', Amount: 850, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-11', Donor: 'Mia Martinez', Category: 'Healthcare', Amount: 1200, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-12', Donor: 'Noah Rodriguez', Category: 'Environment', Amount: 350, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-13', Donor: 'Olivia Lopez', Category: 'Education', Amount: 550, PaymentMethod: 'PayPal' },
      { Date: '2024-01-14', Donor: 'Paul Harris', Category: 'Healthcare', Amount: 1800, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-15', Donor: 'Quinn Clark', Category: 'Environment', Amount: 450, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-16', Donor: 'Rachel Lewis', Category: 'Education', Amount: 700, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-17', Donor: 'Sam Walker', Category: 'Healthcare', Amount: 2200, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-18', Donor: 'Tina Hall', Category: 'Environment', Amount: 280, PaymentMethod: 'PayPal' },
      { Date: '2024-01-19', Donor: 'Uma Young', Category: 'Education', Amount: 650, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-20', Donor: 'Victor King', Category: 'Healthcare', Amount: 1600, PaymentMethod: 'Bank Transfer' },
    ],
  },
  medical: {
    data: [
      { Date: '2024-01-02', 'Patient ID': 'P001', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 45, 'Blood Pressure (mmHg)': '145/95', 'Heart Rate (bpm)': 78, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 350, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-03', 'Patient ID': 'P002', Department: 'Orthopedics', Diagnosis: 'Fracture', Age: 32, 'Blood Pressure (mmHg)': '120/80', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 1200, Medication: 'Pain Reliever', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-01-04', 'Patient ID': 'P003', Department: 'Pediatrics', Diagnosis: 'Common Cold', Age: 8, 'Blood Pressure (mmHg)': '110/70', 'Heart Rate (bpm)': 85, 'Temperature (°F)': 100.4, 'Treatment Cost ($)': 150, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-05', 'Patient ID': 'P001', Department: 'Cardiology', Diagnosis: 'Follow-up', Age: 45, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.4, 'Treatment Cost ($)': 200, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-06', 'Patient ID': 'P004', Department: 'Neurology', Diagnosis: 'Migraine', Age: 28, 'Blood Pressure (mmHg)': '115/75', 'Heart Rate (bpm)': 68, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 450, Medication: 'Preventive Medication', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-01-07', 'Patient ID': 'P005', Department: 'Emergency', Diagnosis: 'Appendicitis', Age: 35, 'Blood Pressure (mmHg)': '130/85', 'Heart Rate (bpm)': 92, 'Temperature (°F)': 101.2, 'Treatment Cost ($)': 8500, Medication: 'Surgery', 'Visit Duration (min)': 180, Status: 'Emergency' },
      { Date: '2024-01-08', 'Patient ID': 'P006', Department: 'Dermatology', Diagnosis: 'Eczema', Age: 22, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 70, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 280, Medication: 'Topical Cream', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-09', 'Patient ID': 'P002', Department: 'Orthopedics', Diagnosis: 'Follow-up', Age: 32, 'Blood Pressure (mmHg)': '120/80', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 300, Medication: 'Physical Therapy', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-10', 'Patient ID': 'P007', Department: 'Cardiology', Diagnosis: 'Arrhythmia', Age: 58, 'Blood Pressure (mmHg)': '150/100', 'Heart Rate (bpm)': 95, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 1200, Medication: 'Blood Thinner', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-11', 'Patient ID': 'P008', Department: 'Pediatrics', Diagnosis: 'Vaccination', Age: 5, 'Blood Pressure (mmHg)': '105/65', 'Heart Rate (bpm)': 90, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 120, Medication: 'Vaccine', 'Visit Duration (min)': 10, Status: 'Completed' },
      { Date: '2024-01-12', 'Patient ID': 'P009', Department: 'Orthopedics', Diagnosis: 'Back Pain', Age: 42, 'Blood Pressure (mmHg)': '125/82', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 550, Medication: 'Muscle Relaxant', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-13', 'Patient ID': 'P010', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 51, 'Blood Pressure (mmHg)': '148/98', 'Heart Rate (bpm)': 80, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 380, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-14', 'Patient ID': 'P003', Department: 'Pediatrics', Diagnosis: 'Follow-up', Age: 8, 'Blood Pressure (mmHg)': '112/72', 'Heart Rate (bpm)': 82, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 100, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-15', 'Patient ID': 'P011', Department: 'Neurology', Diagnosis: 'Epilepsy', Age: 19, 'Blood Pressure (mmHg)': '116/76', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 650, Medication: 'Anticonvulsant', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-16', 'Patient ID': 'P012', Department: 'Dermatology', Diagnosis: 'Psoriasis', Age: 38, 'Blood Pressure (mmHg)': '122/80', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 420, Medication: 'Topical Treatment', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-17', 'Patient ID': 'P013', Department: 'Emergency', Diagnosis: 'Heart Attack', Age: 62, 'Blood Pressure (mmHg)': '160/110', 'Heart Rate (bpm)': 105, 'Temperature (°F)': 100.8, 'Treatment Cost ($)': 25000, Medication: 'Emergency Care', 'Visit Duration (min)': 240, Status: 'Emergency' },
      { Date: '2024-01-18', 'Patient ID': 'P014', Department: 'Cardiology', Diagnosis: 'Angina', Age: 55, 'Blood Pressure (mmHg)': '142/92', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 99.0, 'Treatment Cost ($)': 800, Medication: 'Nitroglycerin', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-01-19', 'Patient ID': 'P015', Department: 'Orthopedics', Diagnosis: 'Sprain', Age: 29, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 73, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 320, Medication: 'Ice Pack', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-20', 'Patient ID': 'P016', Department: 'Pediatrics', Diagnosis: 'Asthma', Age: 12, 'Blood Pressure (mmHg)': '108/68', 'Heart Rate (bpm)': 95, 'Temperature (°F)': 99.5, 'Treatment Cost ($)': 280, Medication: 'Inhaler', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-21', 'Patient ID': 'P017', Department: 'Neurology', Diagnosis: 'Stroke', Age: 68, 'Blood Pressure (mmHg)': '170/105', 'Heart Rate (bpm)': 98, 'Temperature (°F)': 100.2, 'Treatment Cost ($)': 18000, Medication: 'Emergency Care', 'Visit Duration (min)': 300, Status: 'Emergency' },
      { Date: '2024-01-22', 'Patient ID': 'P018', Department: 'Dermatology', Diagnosis: 'Acne', Age: 16, 'Blood Pressure (mmHg)': '112/70', 'Heart Rate (bpm)': 78, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 180, Medication: 'Topical Treatment', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-23', 'Patient ID': 'P019', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 48, 'Blood Pressure (mmHg)': '144/94', 'Heart Rate (bpm)': 77, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 360, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-24', 'Patient ID': 'P020', Department: 'Orthopedics', Diagnosis: 'Arthritis', Age: 65, 'Blood Pressure (mmHg)': '128/84', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 680, Medication: 'Anti-inflammatory', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-25', 'Patient ID': 'P021', Department: 'Pediatrics', Diagnosis: 'Bronchitis', Age: 10, 'Blood Pressure (mmHg)': '106/66', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 100.1, 'Treatment Cost ($)': 240, Medication: 'Antibiotic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-26', 'Patient ID': 'P022', Department: 'Neurology', Diagnosis: 'Headache', Age: 31, 'Blood Pressure (mmHg)': '114/74', 'Heart Rate (bpm)': 71, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 220, Medication: 'Analgesic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-27', 'Patient ID': 'P023', Department: 'Dermatology', Diagnosis: 'Allergy', Age: 24, 'Blood Pressure (mmHg)': '120/78', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 200, Medication: 'Antihistamine', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-28', 'Patient ID': 'P024', Department: 'Cardiology', Diagnosis: 'Follow-up', Age: 55, 'Blood Pressure (mmHg)': '138/88', 'Heart Rate (bpm)': 82, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 250, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-29', 'Patient ID': 'P025', Department: 'Emergency', Diagnosis: 'Accident', Age: 41, 'Blood Pressure (mmHg)': '135/88', 'Heart Rate (bpm)': 89, 'Temperature (°F)': 99.8, 'Treatment Cost ($)': 5200, Medication: 'Emergency Care', 'Visit Duration (min)': 120, Status: 'Emergency' },
      { Date: '2024-01-30', 'Patient ID': 'P026', Department: 'Orthopedics', Diagnosis: 'Knee Injury', Age: 36, 'Blood Pressure (mmHg)': '122/80', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 450, Medication: 'Physical Therapy', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-31', 'Patient ID': 'P027', Department: 'Pediatrics', Diagnosis: 'Fever', Age: 7, 'Blood Pressure (mmHg)': '104/64', 'Heart Rate (bpm)': 92, 'Temperature (°F)': 101.5, 'Treatment Cost ($)': 160, Medication: 'Antipyretic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-01', 'Patient ID': 'P028', Department: 'Neurology', Diagnosis: 'Multiple Sclerosis', Age: 44, 'Blood Pressure (mmHg)': '124/82', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 1500, Medication: 'Immunosuppressant', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-02-02', 'Patient ID': 'P029', Department: 'Dermatology', Diagnosis: 'Sunburn', Age: 18, 'Blood Pressure (mmHg)': '116/74', 'Heart Rate (bpm)': 80, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 120, Medication: 'Aloe Vera', 'Visit Duration (min)': 10, Status: 'Completed' },
      { Date: '2024-02-03', 'Patient ID': 'P030', Department: 'Cardiology', Diagnosis: 'Heart Failure', Age: 71, 'Blood Pressure (mmHg)': '155/100', 'Heart Rate (bpm)': 102, 'Temperature (°F)': 99.5, 'Treatment Cost ($)': 3500, Medication: 'Diuretic', 'Visit Duration (min)': 50, Status: 'Completed' },
      { Date: '2024-02-04', 'Patient ID': 'P031', Department: 'Orthopedics', Diagnosis: 'Follow-up', Age: 29, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 280, Medication: 'Physical Therapy', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-05', 'Patient ID': 'P032', Department: 'Pediatrics', Diagnosis: 'Measles', Age: 6, 'Blood Pressure (mmHg)': '102/62', 'Heart Rate (bpm)': 96, 'Temperature (°F)': 101.8, 'Treatment Cost ($)': 320, Medication: 'Vaccine', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-06', 'Patient ID': 'P033', Department: 'Neurology', Diagnosis: 'Alzheimer\'s', Age: 75, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 85, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 2200, Medication: 'Memory Medication', 'Visit Duration (min)': 50, Status: 'Completed' },
      { Date: '2024-02-07', 'Patient ID': 'P034', Department: 'Dermatology', Diagnosis: 'Eczema', Age: 26, 'Blood Pressure (mmHg)': '120/78', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 290, Medication: 'Topical Cream', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-08', 'Patient ID': 'P035', Department: 'Cardiology', Diagnosis: 'Arrhythmia', Age: 59, 'Blood Pressure (mmHg)': '152/98', 'Heart Rate (bpm)': 97, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 1100, Medication: 'Blood Thinner', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-02-09', 'Patient ID': 'P036', Department: 'Emergency', Diagnosis: 'Seizure', Age: 33, 'Blood Pressure (mmHg)': '125/82', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 100.5, 'Treatment Cost ($)': 3200, Medication: 'Emergency Care', 'Visit Duration (min)': 180, Status: 'Emergency' },
      { Date: '2024-02-10', 'Patient ID': 'P037', Department: 'Orthopedics', Diagnosis: 'Back Pain', Age: 47, 'Blood Pressure (mmHg)': '126/83', 'Heart Rate (bpm)': 77, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 580, Medication: 'Muscle Relaxant', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-02-11', 'Patient ID': 'P038', Department: 'Pediatrics', Diagnosis: 'Follow-up', Age: 12, 'Blood Pressure (mmHg)': '110/70', 'Heart Rate (bpm)': 87, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 120, Medication: 'Inhaler', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-12', 'Patient ID': 'P039', Department: 'Neurology', Diagnosis: 'Migraine', Age: 35, 'Blood Pressure (mmHg)': '118/76', 'Heart Rate (bpm)': 69, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 480, Medication: 'Preventive Medication', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-13', 'Patient ID': 'P040', Department: 'Dermatology', Diagnosis: 'Psoriasis', Age: 41, 'Blood Pressure (mmHg)': '124/81', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 440, Medication: 'Topical Treatment', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-14', 'Patient ID': 'P041', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 52, 'Blood Pressure (mmHg)': '146/96', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 370, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-15', 'Patient ID': 'P042', Department: 'Orthopedics', Diagnosis: 'Fracture', Age: 38, 'Blood Pressure (mmHg)': '121/79', 'Heart Rate (bpm)': 73, 'Temperature (°F)': 99.0, 'Treatment Cost ($)': 1100, Medication: 'Pain Reliever', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-02-16', 'Patient ID': 'P043', Department: 'Pediatrics', Diagnosis: 'Common Cold', Age: 9, 'Blood Pressure (mmHg)': '107/67', 'Heart Rate (bpm)': 86, 'Temperature (°F)': 100.3, 'Treatment Cost ($)': 140, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-17', 'Patient ID': 'P044', Department: 'Neurology', Diagnosis: 'Epilepsy', Age: 21, 'Blood Pressure (mmHg)': '117/77', 'Heart Rate (bpm)': 71, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 620, Medication: 'Anticonvulsant', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-02-18', 'Patient ID': 'P045', Department: 'Dermatology', Diagnosis: 'Acne', Age: 14, 'Blood Pressure (mmHg)': '110/68', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 170, Medication: 'Topical Treatment', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-19', 'Patient ID': 'P046', Department: 'Cardiology', Diagnosis: 'Angina', Age: 57, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 86, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 750, Medication: 'Nitroglycerin', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-20', 'Patient ID': 'P047', Department: 'Orthopedics', Diagnosis: 'Arthritis', Age: 63, 'Blood Pressure (mmHg)': '130/86', 'Heart Rate (bpm)': 81, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 720, Medication: 'Anti-inflammatory', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-02-21', 'Patient ID': 'P048', Department: 'Pediatrics', Diagnosis: 'Asthma', Age: 11, 'Blood Pressure (mmHg)': '109/69', 'Heart Rate (bpm)': 93, 'Temperature (°F)': 99.4, 'Treatment Cost ($)': 270, Medication: 'Inhaler', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-22', 'Patient ID': 'P049', Department: 'Neurology', Diagnosis: 'Headache', Age: 27, 'Blood Pressure (mmHg)': '113/73', 'Heart Rate (bpm)': 70, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 210, Medication: 'Analgesic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-23', 'Patient ID': 'P050', Department: 'Dermatology', Diagnosis: 'Allergy', Age: 20, 'Blood Pressure (mmHg)': '119/77', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 190, Medication: 'Antihistamine', 'Visit Duration (min)': 15, Status: 'Completed' },
    ],
  },
  banking: {
    data: [
      { Date: '2024-01-01', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Alpha', Amount: 12500, Balance: 12500, Status: 'Completed' },
      { Date: '2024-01-02', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Printer Paper & Ink', Amount: -245.50, Balance: 12254.50, Status: 'Completed' },
      { Date: '2024-01-03', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Adobe Creative Suite Subscription', Amount: -52.99, Balance: 12201.51, Status: 'Completed' },
      { Date: '2024-01-04', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Office Electricity Bill', Amount: -350.00, Balance: 11851.51, Status: 'Completed' },
      { Date: '2024-01-05', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Google Ads Campaign', Amount: -850.00, Balance: 11001.51, Status: 'Completed' },
      { Date: '2024-01-06', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Beta', Amount: 8900, Balance: 19901.51, Status: 'Completed' },
      { Date: '2024-01-07', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Meeting - Transportation', Amount: -125.00, Balance: 19776.51, Status: 'Completed' },
      { Date: '2024-01-08', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Cloud Hosting Service', Amount: -199.99, Balance: 19576.52, Status: 'Completed' },
      { Date: '2024-01-09', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Furniture', Amount: -450.00, Balance: 19126.52, Status: 'Completed' },
      { Date: '2024-01-10', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Gamma', Amount: 15000, Balance: 34126.52, Status: 'Completed' },
      { Date: '2024-01-11', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Payroll', Description: 'Employee Salary - January', Amount: -8500.00, Balance: 25626.52, Status: 'Completed' },
      { Date: '2024-01-12', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Social Media Ads', Amount: -650.00, Balance: 24976.52, Status: 'Completed' },
      { Date: '2024-01-13', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Legal Consultation', Amount: -1200.00, Balance: 23776.52, Status: 'Completed' },
      { Date: '2024-01-14', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'CRM Software License', Amount: -89.99, Balance: 23686.53, Status: 'Completed' },
      { Date: '2024-01-15', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 26886.53, Status: 'Completed' },
      { Date: '2024-01-16', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Computer Equipment', Amount: -1850.00, Balance: 25036.53, Status: 'Completed' },
      { Date: '2024-01-17', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Rent', Description: 'Office Rent - January', Amount: -2500.00, Balance: 22536.53, Status: 'Completed' },
      { Date: '2024-01-18', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Email Marketing Platform', Amount: -79.99, Balance: 22456.54, Status: 'Completed' },
      { Date: '2024-01-19', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Business Conference Registration', Amount: -850.00, Balance: 21606.54, Status: 'Completed' },
      { Date: '2024-01-20', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Delta', Amount: 11200, Balance: 32806.54, Status: 'Completed' },
      { Date: '2024-01-21', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Accounting Services', Amount: -450.00, Balance: 32356.54, Status: 'Completed' },
      { Date: '2024-01-22', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Internet & Phone Service', Amount: -195.00, Balance: 32161.54, Status: 'Completed' },
      { Date: '2024-01-23', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Stationery & Supplies', Amount: -125.50, Balance: 32036.04, Status: 'Completed' },
      { Date: '2024-01-24', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Content Creation Tools', Amount: -299.99, Balance: 31736.05, Status: 'Completed' },
      { Date: '2024-01-25', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Epsilon', Amount: 9800, Balance: 41536.05, Status: 'Completed' },
      { Date: '2024-01-26', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Project Management Tool', Amount: -149.99, Balance: 41386.06, Status: 'Completed' },
      { Date: '2024-01-27', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Site Visit - Travel', Amount: -425.00, Balance: 40961.06, Status: 'Completed' },
      { Date: '2024-01-28', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Tax Preparation Services', Amount: -850.00, Balance: 40111.06, Status: 'Completed' },
      { Date: '2024-01-29', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Website Hosting & Domain', Amount: -89.99, Balance: 40021.07, Status: 'Completed' },
      { Date: '2024-01-30', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 43221.07, Status: 'Completed' },
      { Date: '2024-01-31', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Monthly Office Supplies', Amount: -185.75, Balance: 43035.32, Status: 'Completed' },
      { Date: '2024-02-01', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Zeta', Amount: 14500, Balance: 57535.32, Status: 'Completed' },
      { Date: '2024-02-02', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Google Ads Campaign', Amount: -950.00, Balance: 56585.32, Status: 'Completed' },
      { Date: '2024-02-03', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Design Software License', Amount: -79.99, Balance: 56505.33, Status: 'Completed' },
      { Date: '2024-02-04', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Office Electricity Bill', Amount: -375.00, Balance: 56130.33, Status: 'Completed' },
      { Date: '2024-02-05', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'LinkedIn Ads Campaign', Amount: -650.00, Balance: 55480.33, Status: 'Completed' },
      { Date: '2024-02-06', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Eta', Amount: 10200, Balance: 65680.33, Status: 'Completed' },
      { Date: '2024-02-07', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Cloud Storage Service', Amount: -199.99, Balance: 65480.34, Status: 'Completed' },
      { Date: '2024-02-08', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Equipment Maintenance', Amount: -325.00, Balance: 65155.34, Status: 'Completed' },
      { Date: '2024-02-09', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Theta', Amount: 16800, Balance: 81955.34, Status: 'Completed' },
      { Date: '2024-02-10', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Payroll', Description: 'Employee Salary - February', Amount: -8500.00, Balance: 73455.34, Status: 'Completed' },
      { Date: '2024-02-11', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Facebook Ads Campaign', Amount: -750.00, Balance: 72705.34, Status: 'Completed' },
      { Date: '2024-02-12', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Legal Document Review', Amount: -550.00, Balance: 72155.34, Status: 'Completed' },
      { Date: '2024-02-13', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Business Trip - Accommodation', Amount: -650.00, Balance: 71505.34, Status: 'Completed' },
      { Date: '2024-02-14', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 74705.34, Status: 'Completed' },
      { Date: '2024-02-15', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Analytics Tool Subscription', Amount: -149.99, Balance: 74555.35, Status: 'Completed' },
      { Date: '2024-02-16', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'New Office Furniture', Amount: -2200.00, Balance: 72355.35, Status: 'Completed' },
      { Date: '2024-02-17', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Rent', Description: 'Office Rent - February', Amount: -2500.00, Balance: 69855.35, Status: 'Completed' },
      { Date: '2024-02-18', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'SEO Tools Subscription', Amount: -199.99, Balance: 69655.36, Status: 'Completed' },
      { Date: '2024-02-19', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Meeting - Transportation', Amount: -145.00, Balance: 69510.36, Status: 'Completed' },
      { Date: '2024-02-20', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Iota', Amount: 13200, Balance: 82710.36, Status: 'Completed' },
      { Date: '2024-02-21', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Consulting Services', Amount: -1200.00, Balance: 81510.36, Status: 'Completed' },
      { Date: '2024-02-22', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Internet & Phone Service', Amount: -195.00, Balance: 81315.36, Status: 'Completed' },
      { Date: '2024-02-23', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Supplies Restock', Amount: -225.50, Balance: 81089.86, Status: 'Completed' },
      { Date: '2024-02-24', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Video Production Tools', Amount: -450.00, Balance: 80639.86, Status: 'Completed' },
      { Date: '2024-02-25', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Kappa', Amount: 11500, Balance: 92139.86, Status: 'Completed' },
      { Date: '2024-02-26', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Security Software License', Amount: -299.99, Balance: 91839.87, Status: 'Completed' },
      { Date: '2024-02-27', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Industry Conference - Registration', Amount: -1200.00, Balance: 90639.87, Status: 'Completed' },
      { Date: '2024-02-28', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Financial Advisory Services', Amount: -650.00, Balance: 89989.87, Status: 'Completed' },
      { Date: '2024-02-29', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 93189.87, Status: 'Completed' },
    ],
  },
  yearlyIncome: {
    data: [
      { Year: '2020', Income: 0 },
      { Year: '2021', Income: 1200 },
      { Year: '2022', Income: 5600 },
      { Year: '2023', Income: 63000 },
      { Year: '2024', Income: 554000 },
      { Year: '2025', Income: 930000 },
    ],
  },
  usaspending: {
    data: [
      { 'Award Date': '2024-01-15', 'Award Amount': 2500000, 'Recipient Name': 'Tech Solutions Inc', 'Awarding Agency': 'Department of Defense', 'Award Type': 'Contract', State: 'VA', 'NAICS Code': 541511, Description: 'Software Development Services' },
      { 'Award Date': '2024-01-18', 'Award Amount': 1850000, 'Recipient Name': 'Global Construction Group', 'Awarding Agency': 'General Services Administration', 'Award Type': 'Contract', State: 'CA', 'NAICS Code': 236220, Description: 'Building Renovation Project' },
      { 'Award Date': '2024-01-22', 'Award Amount': 3200000, 'Recipient Name': 'Medical Research Labs', 'Awarding Agency': 'National Institutes of Health', 'Award Type': 'Grant', State: 'MD', 'NAICS Code': 541712, Description: 'Biomedical Research Study' },
      { 'Award Date': '2024-01-25', 'Award Amount': 950000, 'Recipient Name': 'Cybersecurity Systems LLC', 'Awarding Agency': 'Department of Homeland Security', 'Award Type': 'Contract', State: 'TX', 'NAICS Code': 541519, Description: 'Network Security Assessment' },
      { 'Award Date': '2024-02-01', 'Award Amount': 4200000, 'Recipient Name': 'Transportation Services Co', 'Awarding Agency': 'Department of Transportation', 'Award Type': 'Contract', State: 'FL', 'NAICS Code': 485111, Description: 'Fleet Vehicle Maintenance' },
      { 'Award Date': '2024-02-05', 'Award Amount': 1650000, 'Recipient Name': 'Environmental Solutions Inc', 'Awarding Agency': 'Environmental Protection Agency', 'Award Type': 'Grant', State: 'WA', 'NAICS Code': 562910, Description: 'Water Quality Monitoring Program' },
      { 'Award Date': '2024-02-08', 'Award Amount': 2800000, 'Recipient Name': 'Aerospace Technologies', 'Awarding Agency': 'NASA', 'Award Type': 'Contract', State: 'AL', 'NAICS Code': 336411, Description: 'Satellite Component Development' },
      { 'Award Date': '2024-02-12', 'Award Amount': 1100000, 'Recipient Name': 'Education Services Group', 'Awarding Agency': 'Department of Education', 'Award Type': 'Grant', State: 'NY', 'NAICS Code': 611710, Description: 'STEM Education Initiative' },
      { 'Award Date': '2024-02-15', 'Award Amount': 3750000, 'Recipient Name': 'Energy Systems Corp', 'Awarding Agency': 'Department of Energy', 'Award Type': 'Contract', State: 'CO', 'NAICS Code': 221112, Description: 'Renewable Energy Research' },
      { 'Award Date': '2024-02-18', 'Award Amount': 2200000, 'Recipient Name': 'Healthcare Innovations', 'Awarding Agency': 'Department of Veterans Affairs', 'Award Type': 'Contract', State: 'NC', 'NAICS Code': 621111, Description: 'Medical Equipment Procurement' },
      { 'Award Date': '2024-02-22', 'Award Amount': 850000, 'Recipient Name': 'Data Analytics Firm', 'Awarding Agency': 'Census Bureau', 'Award Type': 'Contract', State: 'MA', 'NAICS Code': 541511, Description: 'Data Processing Services' },
      { 'Award Date': '2024-02-25', 'Award Amount': 1950000, 'Recipient Name': 'Agricultural Research Center', 'Awarding Agency': 'Department of Agriculture', 'Award Type': 'Grant', State: 'IA', 'NAICS Code': 541712, Description: 'Crop Yield Research' },
      { 'Award Date': '2024-03-01', 'Award Amount': 3100000, 'Recipient Name': 'Defense Contractors Inc', 'Awarding Agency': 'Department of Defense', 'Award Type': 'Contract', State: 'AZ', 'NAICS Code': 336414, Description: 'Military Vehicle Parts' },
      { 'Award Date': '2024-03-05', 'Award Amount': 1400000, 'Recipient Name': 'Public Safety Systems', 'Awarding Agency': 'Department of Justice', 'Award Type': 'Grant', State: 'IL', 'NAICS Code': 541519, Description: 'Law Enforcement Technology' },
      { 'Award Date': '2024-03-08', 'Award Amount': 2650000, 'Recipient Name': 'Infrastructure Builders', 'Awarding Agency': 'Department of Transportation', 'Award Type': 'Contract', State: 'PA', 'NAICS Code': 237310, Description: 'Highway Construction Project' },
      { 'Award Date': '2024-03-12', 'Award Amount': 1750000, 'Recipient Name': 'Marine Research Institute', 'Awarding Agency': 'National Oceanic and Atmospheric Administration', 'Award Type': 'Grant', State: 'OR', 'NAICS Code': 541712, Description: 'Oceanographic Study' },
      { 'Award Date': '2024-03-15', 'Award Amount': 4800000, 'Recipient Name': 'IT Services Corporation', 'Awarding Agency': 'General Services Administration', 'Award Type': 'Contract', State: 'GA', 'NAICS Code': 541511, Description: 'Enterprise IT Support' },
      { 'Award Date': '2024-03-18', 'Award Amount': 920000, 'Recipient Name': 'Social Services Network', 'Awarding Agency': 'Department of Health and Human Services', 'Award Type': 'Grant', State: 'MI', 'NAICS Code': 624190, Description: 'Community Health Program' },
      { 'Award Date': '2024-03-22', 'Award Amount': 2100000, 'Recipient Name': 'Telecommunications Systems', 'Awarding Agency': 'Federal Communications Commission', 'Award Type': 'Contract', State: 'NJ', 'NAICS Code': 517311, Description: 'Network Infrastructure Upgrade' },
      { 'Award Date': '2024-03-25', 'Award Amount': 1350000, 'Recipient Name': 'Wildlife Conservation Org', 'Awarding Agency': 'Department of Interior', 'Award Type': 'Grant', State: 'MT', 'NAICS Code': 813312, Description: 'Wildlife Habitat Restoration' },
      { 'Award Date': '2024-03-28', 'Award Amount': 3400000, 'Recipient Name': 'Aviation Services Group', 'Awarding Agency': 'Federal Aviation Administration', 'Award Type': 'Contract', State: 'OK', 'NAICS Code': 488190, Description: 'Airport Security Systems' },
      { 'Award Date': '2024-04-01', 'Award Amount': 1550000, 'Recipient Name': 'Food Safety Labs', 'Awarding Agency': 'Food and Drug Administration', 'Award Type': 'Grant', State: 'MN', 'NAICS Code': 541712, Description: 'Food Safety Testing Program' },
      { 'Award Date': '2024-04-05', 'Award Amount': 2900000, 'Recipient Name': 'Engineering Consultants', 'Awarding Agency': 'Army Corps of Engineers', 'Award Type': 'Contract', State: 'LA', 'NAICS Code': 541330, Description: 'Flood Control Project Design' },
      { 'Award Date': '2024-04-08', 'Award Amount': 1180000, 'Recipient Name': 'Rural Development Corp', 'Awarding Agency': 'Department of Agriculture', 'Award Type': 'Grant', State: 'ND', 'NAICS Code': 541611, Description: 'Rural Economic Development' },
      { 'Award Date': '2024-04-12', 'Award Amount': 4100000, 'Recipient Name': 'Space Systems Engineering', 'Awarding Agency': 'NASA', 'Award Type': 'Contract', State: 'CA', 'NAICS Code': 336414, Description: 'Spacecraft Propulsion System' },
      { 'Award Date': '2024-04-15', 'Award Amount': 2250000, 'Recipient Name': 'Emergency Response Services', 'Awarding Agency': 'Federal Emergency Management Agency', 'Award Type': 'Grant', State: 'FL', 'NAICS Code': 624230, Description: 'Disaster Preparedness Training' },
      { 'Award Date': '2024-04-18', 'Award Amount': 1680000, 'Recipient Name': 'Financial Services Tech', 'Awarding Agency': 'Department of Treasury', 'Award Type': 'Contract', State: 'DC', 'NAICS Code': 541511, Description: 'Financial System Modernization' },
      { 'Award Date': '2024-04-22', 'Award Amount': 980000, 'Recipient Name': 'Mental Health Services', 'Awarding Agency': 'Substance Abuse and Mental Health Services Administration', 'Award Type': 'Grant', State: 'VT', 'NAICS Code': 621420, Description: 'Mental Health Outreach Program' },
      { 'Award Date': '2024-04-25', 'Award Amount': 2750000, 'Recipient Name': 'Border Security Systems', 'Awarding Agency': 'Customs and Border Protection', 'Award Type': 'Contract', State: 'TX', 'NAICS Code': 541519, Description: 'Surveillance Technology' },
      { 'Award Date': '2024-04-28', 'Award Amount': 1420000, 'Recipient Name': 'Urban Planning Institute', 'Awarding Agency': 'Department of Housing and Urban Development', 'Award Type': 'Grant', State: 'OH', 'NAICS Code': 541611, Description: 'Urban Development Study' },
    ],
  },
}

router.get('/sales', (req, res) => {
  const dataset = exampleDatasets.sales
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/attendance', (req, res) => {
  const dataset = exampleDatasets.attendance
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/donations', (req, res) => {
  const dataset = exampleDatasets.donations
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/medical', (req, res) => {
  const dataset = exampleDatasets.medical
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/banking', (req, res) => {
  const dataset = exampleDatasets.banking
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/yearly-income', (req, res) => {
  const dataset = exampleDatasets.yearlyIncome
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/usaspending', (req, res) => {
  const dataset = exampleDatasets.usaspending
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

// Route to fetch real-time USASpending data from the official API
router.get('/usaspending/live', async (req, res) => {
  try {
    // Get query parameters for filtering (optional)
    const limit = parseInt(req.query.limit) || 100 // Default to 100 records
    const fiscalYear = parseInt(req.query.fiscal_year) || new Date().getFullYear() // Default to current year
    const awardType = req.query.award_type || null // 'A' for assistance (grants), 'C' for procurement (contracts), or null for all
    const state = req.query.state || null // State code (e.g., 'VA', 'CA')
    
    // Build the API URL - using the spending_by_award endpoint
    const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
    
    // Prepare the request body for the USASpending API
    // Using the correct format based on API documentation
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    // Calculate fiscal year dates (FY starts Oct 1)
    let startYear = fiscalYear
    let endYear = fiscalYear + 1
    if (currentMonth >= 10) {
      // We're in the new fiscal year
      startYear = currentYear
      endYear = currentYear + 1
    } else {
      // We're still in the previous fiscal year
      startYear = currentYear - 1
      endYear = currentYear
    }
    
    // Build filters object
    // NOTE: award_type_codes is REQUIRED by the API
    const filters = {
      time_period: [
        {
          start_date: `${startYear}-10-01`,
          end_date: `${endYear}-09-30`
        }
      ],
      // award_type_codes is required - use provided type or default to both
      award_type_codes: awardType ? [awardType.toUpperCase()] : ['A', 'C'] // 'A' = grants, 'C' = contracts
    }
    
    // Add optional state filter if provided
    if (state) {
      filters.recipient_locations = [
        {
          country: 'USA',
          state: state.toUpperCase()
        }
      ]
    }
    
    // Use field names that match the API format (capitalized with spaces)
    const requestBody = {
      filters: filters,
      fields: [
        'Award ID',
        'Award Amount',
        'Start Date',
        'Recipient Name',
        'Awarding Agency',
        'Contract Award Type',
        'recipient_location_state_code',
        'naics_code',
        'Description'
      ],
      page: 1,
      limit: Math.min(limit, 100),
      sort: 'Award Amount', // Must match one of the available sort fields
      order: 'desc'
    }
    
    // Add optional filters
    if (awardType) {
      // Award type codes: 'A' for assistance (grants), 'C' for procurement (contracts)
      requestBody.filters.award_type_codes = [awardType.toUpperCase()]
    }
    
    if (state) {
      requestBody.filters.recipient_locations = [
        {
          country: 'USA',
          state: state.toUpperCase()
        }
      ]
    }
    
    // Fetch data from USASpending API using axios
    console.log('Fetching USASpending data from:', apiUrl)
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    let response
    try {
      response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })
    } catch (apiError) {
      // Log the full error details
      if (apiError.response) {
        console.error('USASpending API Error Response:', {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: JSON.stringify(apiError.response.data, null, 2)
        })
        throw new Error(`USASpending API error (${apiError.response.status}): ${JSON.stringify(apiError.response.data)}`)
      }
      throw apiError
    }
    
    const apiData = response.data
    console.log('USASpending API response status:', response.status)
    console.log('Response keys:', Object.keys(apiData))
    
    // Transform USASpending API response to our format
    // The API returns results in different structures, so we handle multiple formats
    const results = apiData.results || apiData.data || apiData.awards || []
    console.log('Number of results:', results.length)
    
    if (results.length === 0 && apiData.page_metadata) {
      console.log('API metadata:', JSON.stringify(apiData.page_metadata, null, 2))
    }
    
    const transformedData = results.map((award) => {
      // Handle the API response format - fields are returned with capitalized names
      const awardId = award['Award ID'] || award.Award_ID || award.award_id || award.id || ''
      const awardDate = award['Start Date'] || award['End Date'] || award.Start_Date || award.End_Date || ''
      const awardAmount = parseFloat(
        award['Award Amount'] || 
        award.Award_Amount || 
        0
      )
      const recipientName = award['Recipient Name'] || 
        award.Recipient_Name || 
        'Unknown'
      const awardingAgency = award['Awarding Agency'] || 
        award.Awarding_Agency || 
        'Unknown'
      const awardTypeValue = award['Contract Award Type'] || 
        award.Contract_Award_Type || 
        'Unknown'
      const recipientState = award['recipient_location_state_code'] || 
        award.recipient_location_state_code || 
        ''
      const naicsCode = parseInt(
        award['naics_code'] || 
        award.naics_code || 
        0
      )
      const description = award['Description'] || 
        award.Description || 
        ''
      
      return {
        'Award ID': awardId,
        'Award Date': awardDate,
        'Award Amount': awardAmount,
        'Recipient Name': recipientName,
        'Awarding Agency': awardingAgency,
        'Award Type': awardTypeValue,
        'State': recipientState,
        'NAICS Code': naicsCode,
        'Description': description
      }
    })
    
    if (transformedData.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for the specified filters',
        message: 'Try adjusting the fiscal_year, award_type, or state parameters',
        hint: 'Use ?fiscal_year=2023&limit=50&award_type=C for contracts or award_type=A for grants'
      })
    }
    
    // Process the data
    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)
    
    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'USASpending.gov API (Real-time)',
      filters: {
        fiscal_year: fiscalYear,
        award_type: awardType,
        state: state,
        limit: limit
      },
      apiResponse: {
        totalRecords: apiData.page_metadata?.total || apiData.count || processedData.length,
        page: apiData.page_metadata?.page || 1
      }
    })
  } catch (error) {
    console.error('Error fetching USASpending data:', error.message)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data, null, 2))
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: error.message,
        apiError: error.response.data,
        status: error.response.status,
        hint: 'The USASpending API returned an error. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request)
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: 'No response from USASpending API',
        hint: 'The USASpending API may be temporarily unavailable. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message)
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: error.message,
        hint: 'The USASpending API may be temporarily unavailable. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    }
  }
})

// Drill-down: fetch subawards/subcontractors for a set of prime award IDs
// Usage: GET /api/example/usaspending/subawards?award_ids=ID1,ID2,...&limit=200
router.get('/usaspending/subawards', async (req, res) => {
  try {
    const awardIdsRaw = (req.query.award_ids || '').toString().trim()
    const limit = Math.min(parseInt(req.query.limit) || 200, 500)

    if (!awardIdsRaw) {
      return res.status(400).json({
        error: 'Missing award_ids',
        message: 'Provide award_ids as a comma-separated list.',
      })
    }

    // Cap to avoid hammering the API
    const awardIds = awardIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)

    // NOTE: USASpending subaward data is separate from prime award data.
    // This endpoint structure is based on USASpending v2 conventions and may evolve.
    const apiUrl = 'https://api.usaspending.gov/api/v2/awards/subawards/'

    const allResults = []

    for (const award_id of awardIds) {
      const body = {
        award_id,
        limit: Math.min(limit, 500),
        page: 1,
        sort: 'subaward_amount',
        order: 'desc',
      }

      try {
        const resp = await axios.post(apiUrl, body, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 30000,
        })
        const results = resp.data?.results || resp.data?.data || []
        results.forEach((r) => allResults.push({ ...r, __prime_award_id: award_id }))
      } catch (e) {
        // If one award id fails, continue with others
        console.error('Subawards fetch failed for award_id:', award_id, e?.response?.status || e?.message)
      }
    }

    // Transform into a generic table
    const transformed = allResults.map((r) => {
      const subName =
        r.subawardee_name ||
        r.sub_awardee_name ||
        r.awardee_name ||
        r.recipient_name ||
        r.subaward_recipient_name ||
        'Unknown'

      const subAmount = parseFloat(
        r.subaward_amount ||
          r.sub_award_amount ||
          r.amount ||
          r.total_obligation ||
          0
      )

      const subDate =
        r.subaward_action_date ||
        r.sub_award_action_date ||
        r.action_date ||
        r.subaward_date ||
        ''

      const primeAwardId = r.__prime_award_id || r.award_id || ''

      const desc = r.description || r.subaward_description || ''

      return {
        'Prime Award ID': primeAwardId,
        'Subcontractor Name': subName,
        'Subaward Amount': subAmount,
        'Subaward Date': subDate,
        Description: desc,
      }
    })

    const columns = ['Prime Award ID', 'Subcontractor Name', 'Subaward Amount', 'Subaward Date', 'Description']
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformed, columns)

    return res.json({
      data: transformed,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: transformed.length,
      source: 'USASpending.gov API (Subawards)',
      note: 'Subaward coverage varies by award; some primes may have no reported subawards.',
    })
  } catch (err) {
    console.error('Subawards route error:', err)
    return res.status(500).json({
      error: 'Failed to fetch subawards',
      message: err?.message || 'Unknown error',
    })
  }
})

module.exports = router


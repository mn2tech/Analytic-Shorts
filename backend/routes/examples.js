const express = require('express')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')

const router = express.Router()

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
}

router.get('/sales', (req, res) => {
  const dataset = exampleDatasets.sales
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processData(dataset.data)

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
  const processedData = processData(dataset.data)

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
  const processedData = processData(dataset.data)

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
  const processedData = processData(dataset.data)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

module.exports = router


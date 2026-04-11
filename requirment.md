Task: Generate HTML + JSON from Excel with multiple sheets

I have an Excel file that contains 3 sheets (tabs), each sheet has tabular data.

Requirements
Read Excel file
Read all 3 sheets from the Excel file.
Convert each sheet to JSON strucuted data
Each sheet should be converted into its own JSON file.
JSON format: array of objects (each row = 1 object, keys = column headers).
Generate 3 HTML files
Each HTML file:
Loads its corresponding JSON file (same directory).
Renders the data as a table dynamically using JavaScript.
Table should:
Auto-generate columns from JSON keys
Display all rows
Have basic styling (border, padding, header background)
Project structure
All files should be in the same directory:
Excel file
JSON files
HTML files
Script file (if needed)
Tech constraints
Use plain HTML + vanilla JS (no frameworks).
HTML should use fetch() to load JSON.
Add sorting on columns
Add simple search/filter input

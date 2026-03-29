const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./dbsqllite.db', (err) => {
  if (err) {
    console.error("Error opening database " + err.message);
    return;
  }
});

console.log("Fetching client details from the database...\n");

// Query all records from the contacts table
db.all("SELECT * FROM contacts ORDER BY submitted_at DESC", [], (err, rows) => {
  if (err) {
    if (err.message.includes("no such table")) {
      console.log("No contacts found in the database yet (table not created).");
      return;
    }
    throw err;
  }
  
  if (rows.length === 0) {
    console.log("No contacts found in the database yet.");
  } else {
    rows.forEach((row, index) => {
      console.log(`--- Contact #${index + 1} ---`);
      console.log(`ID:         ${row.id}`);
      console.log(`Name:       ${row.name}`);
      console.log(`Email:      ${row.email}`);
      console.log(`Message:    ${row.message}`);
      console.log(`Submitted:  ${row.submitted_at}`);
      console.log("---------------------\n");
    });
  }
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
});

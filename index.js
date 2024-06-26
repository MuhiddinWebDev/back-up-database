import mysql from 'mysql';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import archiver from "archiver";
import dotenv from "dotenv";
import fs from "fs";
import cron from 'node-cron'
import path from 'path';
import { uploadFunc } from "./firebase.js";
dotenv.config();
// create a connection to the MySQL server
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current file
const __dirname = dirname(__filename);
const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_PASS = process.env.DB_PASS;
console.log("Back up cron job is set!");
//set cron
//0 20 * * *
cron.schedule("00 23 1,15 * *", () => {
(() => {
  console.log("Operation started!");
  // Connect to the MySQL server
  const connection = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting: " + err.stack);
      return;
    }

    console.log("Connected as id " + connection.threadId);

    // Check if the backups directory exists and create it if necessary
    if (fs.existsSync("backups")) {
      fs.rm("backups", { recursive: true }, (error) => {
        if (error) {
          console.error(`Failed to delete folder: ${error}`);
          return;
        } else {
          console.log("Folder deleted successfully");
          createBackupsDirectory();
        }
      });
    } else {
      createBackupsDirectory();
    }
  });

  function createBackupsDirectory() {
    fs.mkdirSync("backups");
    if (fs.existsSync("backups.zip")) {
      fs.unlink("backups.zip", (error) => {
        if (error) {
          console.error(`Failed to delete file: ${error}`);
          return;
        } else {
          console.log("File deleted successfully");
          backupDatabases();
        }
      });
    } else {
      backupDatabases();
    }
  }

  function backupDatabases() {
    // Execute the command to backup each database separately
    connection.query("SHOW DATABASES", (error, results, fields) => {
      if (error) throw error;

      // const expectedBackups = results.length;
      // let successfulBackups = 0;

      results.forEach((row) => {
        const database = row.Database;
        const fileName = `backups/${database}.sql.gz`;
        if (database === 'information_schema' || database === 'performance_schema' || database === 'mysql' || database === 'sys') {
          // Skip system databases
          return;
        }
        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');

        // Define the backup file path with timestamp
        const backupFile = path.join(__dirname, `backups/${database}_${timestamp}.sql`);
   
        const dumpCommand = `mysqldump --user=${DB_USER} --password=${DB_PASS} --host=${DB_HOST} ${database} > ${backupFile}`;
        // const cmd = `mysqldump --skip-lock-tables --databases ${database} | gzip > ${fileName}`;
        exec(dumpCommand, (err, stdout, stderr) => {
          if (err) {
            console.error(`Error backing up ${database}: ` + err);
          } else {
            console.log(`Successfully backed up ${database} to ${fileName}`);
            createBackupArchive();
            // successfulBackups++;
            // if (successfulBackups === expectedBackups) {
            // }
          }
        });
      });
    });
  }

  function createBackupArchive() {
    const output = fs.createWriteStream("backups.zip");
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // console.log(output, archive)
    output.on("close", () => {
      console.log("Successfully created backups.zip");
      const filePath = "backups.zip";
      // Upload to Firebase
      uploadFunc(filePath);
      // Close the connection to the MySQL server
      connection.end();
    });

    archive.on("error", (err) => {
      console.error("Error creating backups.zip: " + err);
    });

    archive.pipe(output);
    archive.directory("backups", false);
    archive.finalize();
  }
})();

});
//set cron

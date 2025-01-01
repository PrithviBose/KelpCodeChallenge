const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const pool = require('../sqlConnection');

function convertCSVtoJSON(req, res) {
    try {
        const csvFilePath = process.env.CSV_FILE_PATH;
        if (!csvFilePath || !fs.existsSync(csvFilePath)) {
            return res.status(400).send('CSV file not found or invalid path in environment variable');
        }
        let results = []
        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on('data', (data) => {
                let parsedRow = {}
                Object.entries(data).forEach(([key, value]) => {
                    let splittedKey = key.split('.');
                    splittedKey.reduce((acc, curr, index) => {
                        if (index === splittedKey.length - 1) {
                            acc[curr] = value
                        }
                        else if (!acc[curr]) {
                            acc[curr] = {}
                        }
                        return acc[curr]
                    }, parsedRow)
                });
                results.push(parsedRow);
            }
            )
            .on('end', async () => {
                await insertRow(results);
                getData(res)
            })
            .on('error', (err) => {
                console.error(err);
                res.status(500).send('Error reading CSV file');
            });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
}

async function convertCSVtoJSONWithoutParser(req, res) {
    try {
        const csvFilePath = process.env.CSV_FILE_PATH;

        if (!csvFilePath || !fs.existsSync(csvFilePath)) {
            return res.status(400).send('CSV file not found or invalid path in environment variable');
        }

        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

        if (!fileContent.trim()) {
            return res.status(400).send('CSV file is empty');
        }
        const lines = fileContent.trim().split('\n');

        const headers = lines[0].split(',').map(header => header.trim());

        const results = lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            const parsedRow = {};

            headers.forEach((header, index) => {
                const splittedKey = header.split('.');
                splittedKey.reduce((acc, curr, i) => {
                    if (i === splittedKey.length - 1) {
                        acc[curr] = values[index];
                    } else if (!acc[curr]) {
                        acc[curr] = {};
                    }
                    return acc[curr];
                }, parsedRow);
            });

            return parsedRow;
        });

        await insertRow(results)
            .then(() => getData(res))
            .catch(err => {
                console.error('Error inserting data:', err);
                res.status(500).send('Error inserting data into the database');
            });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Server error');
    }
}

async function insertRow(results) {
    let batchSize = 5000;
    let count = 0

    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);

        for (const row of batch) {
            try {
                const name = `${row.name.firstName} ${row.name.lastName}`;
                const age = row.age;
                const address = row.address; // JSON object
                const additionalInfo = {
                    gender: row.gender,
                    hobbies: row.hobbies,
                };

                const query = `
                    INSERT INTO users (name, age, address, additional_info)
                    VALUES ($1, $2, $3, $4)
                `;

                await pool.query(query, [
                    name, // $1: Name
                    age,  // $2: Age
                    JSON.stringify(address), // $3: Address (JSONB field)
                    JSON.stringify(additionalInfo), // $4: Additional Info (JSONB field)
                ]);

            } catch (err) {
                console.error(`Error inserting row for ${row.firstName} ${row.lastName}: of batch ${count}`, err.stack);
            }
        }
        count++;
        console.log(`${count} batch of ${batch.length} rows inserted successfully`);
    }
}


async function getData(res) {
    try {
        const query = `WITH AgeGroupData AS (
    SELECT 
        CASE
            WHEN age < 20 THEN '< 20'
            WHEN age BETWEEN 20 AND 40 THEN '20 to 40'
            WHEN age BETWEEN 40 AND 60 THEN '40 to 60'
            WHEN age > 60 THEN '> 60'
        END AS age_group,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) AS Percentage
    FROM users
    GROUP BY 
        CASE
            WHEN age < 20 THEN '< 20'
            WHEN age BETWEEN 20 AND 40 THEN '20 to 40'
            WHEN age BETWEEN 40 AND 60 THEN '40 to 60'
            WHEN age > 60 THEN '> 60'
    END
)
SELECT * 
FROM AgeGroupData
ORDER BY 
    CASE
        WHEN age_group = '< 20' THEN 1
        WHEN age_group = '20 to 40' THEN 2
        WHEN age_group = '40 to 60' THEN 3
        WHEN age_group = '> 60' THEN 4
    END;`;
        const result = await pool.query(query);
        console.table(result.rows)
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err.stack);
        res.status(500).send('Error fetching data');
    }
}

module.exports = { convertCSVtoJSON, convertCSVtoJSONWithoutParser, getData };


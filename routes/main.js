const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const fs = require('fs');
const { dirname } = require('path');
const appDir = dirname(require.main.filename);
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBConfig = {
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'AKIARNO54IOA37WAHO6A',
        secretAccessKey: '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',
    },
};


const dynamoDB = new DynamoDBClient(dynamoDBConfig);
const timeConverter = async (UNIX_timestamp, flag = false) => {
    if (flag) {
        var a = new Date(UNIX_timestamp * 1000 - 4 * 60 * 60 * 1000);
    } else {
        var a = new Date(UNIX_timestamp * 1000);
    }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = (a.getDate() < 10) ? '0' + a.getDate() : a.getDate();
    var hour = (a.getHours() < 10) ? '0' + a.getHours() : a.getHours();
    var min = (a.getMinutes() < 10) ? '0' + a.getMinutes() : a.getMinutes();
    var sec = (a.getSeconds() < 10) ? '0' + a.getSeconds() : a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}


router.route("/").get(async (req, res) => {
    res.render('main', { layout: 'index' });
}
);

router.route("/topic").post(async (req, res) => {
    const topic = req.body.topic;
    let data = new Array()
    const tableName = 'engr111_data_collection';
    const params = {
        TableName: tableName,
        KeyConditionExpression: '#topic = :topic',
        ExpressionAttributeNames: {
            '#topic': 'topic',
        },
        ExpressionAttributeValues: {
            ':topic': { S: topic },
        },
        ScanIndexForward: false, // Sort in descending order (latest first)
        Limit: 100, // Limit to 2 records
    };

    const command = new QueryCommand(params);

    try {
        const result = await dynamoDB.send(command);
        for (let i = 1; i <= result.Items.length; i++) {
            const item = result.Items[i - 1];
            const displayDate = await timeConverter(item.timestamp.N, true);
            data.push({ payload: item.payload.S, timestamp: displayDate });

        }
    } catch (error) {
        logger.info("Error:" + error)
        data = []
    }
    return res.json({ data: data })
}
);

router.route("/daterange").post(async (req, res) => {
    const dateRange = req.body.dateRange;
    const [startDateStr, endDateStr] = dateRange.split(" - ");
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    startDate.setHours(4, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(3, 59, 59, 999);
    const startDateUnixTimestamp = String(Math.floor(startDate.getTime() / 1000));
    const endDateUnixTimestamp = String(Math.floor(endDate.getTime() / 1000));
    const topic = req.body.topic;
    const tableName = 'engr111_data_collection';
    const params = {
        TableName: tableName,
        KeyConditionExpression: "#topic = :topic AND #timestamp BETWEEN :from AND :to",
        ExpressionAttributeNames: {
            "#topic": "topic",
            "#timestamp": "timestamp",
        },
        ExpressionAttributeValues: {
            ":topic": { S: topic },
            ":from": { N: startDateUnixTimestamp },
            ":to": { N: endDateUnixTimestamp },
        },
    };
    const command = new QueryCommand(params);

    let returnResult = { message: '', status: 200 };
    let jsonData = '';
    try {
        const result = await dynamoDB.send(command);
        console.log(result.Items.length);
        if (result.Items.length) {
            let data = [];
            for (let i = 1; i <= result.Items.length; i++) {
                const item = result.Items[i - 1];
                const displayDate = await timeConverter(item.timestamp.N, true);
                data.push({ payload: item.payload.S, timestamp: displayDate });

            }


            jsonData = JSON.stringify(data, null, 2);
            // Save the data to a text file
            fs.writeFile('output.txt', jsonData, 'utf8', (fileErr) => {
                if (fileErr) {
                    returnResult.message = "Error: Writing File Error";
                    returnResult.status = 500
                    logger.info("Error: Writing File Error")
                }
            });
        } else {
            returnResult.message = "No data to download for given topic";
            returnResult.status = 400;
        }
    } catch (error) {
        let message = "Error:" + error;
        logger.info("Error:" + error)
        return res.json({ message: message, status: 500, file: jsonData });
    }
    return res.json({ message: returnResult.message, status: returnResult.status, file: jsonData })
}
);
module.exports = router;

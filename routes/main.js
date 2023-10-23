const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBConfig = {
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'AKIARNO54IOA37WAHO6A',
        secretAccessKey: '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',
    },
};

const dynamoDB = new DynamoDBClient(dynamoDBConfig);
const timeConverter = async (UNIX_timestamp) => {

    var a = new Date(UNIX_timestamp * 1000);
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
            const displayDate = await timeConverter(item.timestamp.N);
            data.push({ payload: item.payload.S, timestamp: displayDate });

        }
    } catch (error) {
        logger.info("Error:" + error)
        data = []
    }
    return res.json({ data: data })
}
);

module.exports = router;

const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBConfig = {
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'AKIARNO54IOA37WAHO6A',
        secretAccessKey: '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',
    },
};

const dynamoDB = new DynamoDBClient(dynamoDBConfig);


router.route("/").get(async (req, res) => {
    res.render('main', { layout: 'index' });
}
);

router.route("/topic").post(async (req, res) => {
    const topic = req.body.topic;
    let data = {};
    const tableName = 'engr111_data_collection';
    const params = {
        TableName: tableName,
        FilterExpression: 'topic = :topic',
        ExpressionAttributeValues: {
            ':topic': { S: topic },
        },
        Limit: 2, // Limit to the latest 2 rows
    };

    const command = new ScanCommand(params);

    try {
        const result = await dynamoDB.send(command);
        for (let i = 1; i <= result.Items.length; i++) {
            const item = result.Items[i - 1];
            data['payload_' + i] = item.payload.S;
            const timestamp = new Date(item.timestamp.S);
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const displayDate = timestamp.toLocaleDateString('en-US', options);
            data['timestamp_' + i] = displayDate;
        }
        console.log(data);
    } catch (error) {
        data = {}
    }
    return res.json({ topic: topic })
}
);

module.exports = router;

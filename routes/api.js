const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const fs = require("fs");
const { dirname } = require("path");
const appDir = dirname(require.main.filename);
const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const dynamoDBConfig = {
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIARNO54IOA37WAHO6A",
    secretAccessKey: "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",
  },
};
const { ObjectId, Int32 } = require("mongodb");
const dynamoDB = new DynamoDBClient(dynamoDBConfig);
router.route("/team").post(async (req, res) => {
  const teamData = req.body;
  let data = { status: 200, message: "Team Added successfully" };
  const tableName = "engr_111_team";
  const newObjectId = new ObjectId();
  timestamp = Math.floor(new Date().getTime() / 1000);

  const params = {
    TableName: tableName,
    Item: {
      id: { S: newObjectId.toString() },
      name: { S: teamData.name.toString() },
      score_1: {
        N: teamData.score_1 ? teamData.score_1 : 0,
      },
      score_2: {
        N: teamData.score_2 ? teamData.score_2 : 0,
      },
      score_3: {
        N: teamData.score_3 ? teamData.score_3 : 0,
      },
      prof_email: { S: teamData.prof_name.toString() },
      total_score: {
        N: teamData.score_1 + teamData.score_2 + teamData.score_3,
      },
      timestamp: { N: String(timestamp) },
    },
  };

  try {
    const result = await dynamoDB.send(new PutItemCommand(params));
  } catch (error) {
    data.status = 400;
    data.message = error;
  }
  return res.status(data.status).send(data.message);
});

module.exports = router;

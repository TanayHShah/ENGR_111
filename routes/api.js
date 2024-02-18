const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const fs = require("fs");
const { dirname } = require("path");
const appDir = dirname(require.main.filename);
const { exec } = require("child_process");
const path = require("path");
const pythonScriptPath = "python_scripts/auto_scoring.py";

const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const dynamoDBConfig = {
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIARNO54IOA37WAHO6A",
    secretAccessKey: "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",
  },
};
const { ObjectId, Int32 } = require("mongodb");
const { CostExplorer } = require("aws-sdk");
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
      topic: { S: teamData.topic.toString() },
      score_1: {
        N: teamData.score_1 ? teamData.score_1.toString() : String(0),
      },
      score_2: {
        N: teamData.score_2 ? teamData.score_2.toString() : String(0),
      },
      score_3: {
        N: teamData.score_3 ? teamData.score_3.toString() : String(0),
      },
      prof_email: { S: teamData.prof_name.toString() },
      total_score: {
        N:
          (teamData.score_1 ? teamData.score_1.toString() : String(0)) +
          (teamData.score_2 ? teamData.score_2.toString() : String(0)) +
          (teamData.score_3 ? teamData.score_3.toString() : String(0)),
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

router.route("/auto_scoring").get(async (req, res) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const currentDay = `${year}-${month}-${day}`;
  const folderPath = path.join(__dirname, `score_files/${currentDay}`);
  fs.access(folderPath, fs.constants.F_OK, (err) => {
    // Read all files in the folder
    fs.readdir(folderPath, (err, files) => {
      files.forEach((file) => {
        try {
          const filePath = path.join(
            __dirname,
            `score_files/${currentDay}`,
            file
          );
          exec(
            `python ${pythonScriptPath} ${filePath}`,
            (error, stdout, stderr) => {
              if (error) {
              }
              const result = JSON.parse(stdout);
              console.log(result);
            }
          );
        } catch (err) {}
      });
    });
  });
});

router.route("/create_score_file").get(async (req, res) => {
  let data = {
    status: 200,
    message: "Files uploaded successfully",
  };
  const folderPath = path.join(__dirname, `score_files`); // Change this to the directory where you want to create the folder
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const currentDay = `${year}-${month}-${day}`;
  const newFolderPath = path.join(folderPath, currentDay);
  let fileCount = 1;

  // Check if the folder already exists
  if (!fs.existsSync(newFolderPath)) {
    // Create the folder
    fs.mkdir(newFolderPath, { recursive: true }, (err) => {});
  }
  let tableName = "engr_111_team";
  let params = {
    TableName: tableName,
    FilterExpression: "attribute_exists(topic)",
  };
  const command = new ScanCommand(params);
  const result = await dynamoDB.send(command);
  if (result.Items.length) {
    for (let i = 0; i < result.Items.length; i++) {
      const item = result.Items[i];

      const endDate = new Date();
      const startDate = new Date("01/28/2024");
      startDate.setHours(4, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(3, 59, 59, 999);
      const startDateUnixTimestamp = String(
        Math.floor(startDate.getTime() / 1000)
      );
      const endDateUnixTimestamp = String(Math.floor(endDate.getTime() / 1000));
      tableName = "engr111_data_collection";
      params = {
        TableName: tableName,
        KeyConditionExpression:
          "#topic = :topic AND #timestamp BETWEEN :from AND :to",
        ExpressionAttributeNames: {
          "#topic": "topic",
          "#timestamp": "timestamp",
        },
        ExpressionAttributeValues: {
          ":topic": { S: item.topic.S },
          ":from": { N: startDateUnixTimestamp },
          ":to": { N: endDateUnixTimestamp },
        },
      };
      const command = new QueryCommand(params);
      let jsonData = "";
      try {
        const result = await dynamoDB.send(command);
        if (result.Items.length) {
          let fileContent = [];
          for (let i = 1; i <= result.Items.length; i++) {
            const innerLoopItem = result.Items[i - 1];
            const displayDate = await timeConverter(
              innerLoopItem.timestamp.N,
              true
            );
            fileContent.push({
              payload: innerLoopItem.payload.S,
              timestamp: displayDate,
            });
          }
          jsonData = await formatAsTable(
            fileContent,
            item.topic.S,
            `${
              startDate.getMonth() + 1
            }\/${startDate.getDate()}\/${startDate.getFullYear()}  - ${
              endDate.getMonth() + 1
            }\/${endDate.getDate()}\/${endDate.getFullYear()}`
          );
          if (fs.existsSync(newFolderPath)) {
            fs.writeFile(
              newFolderPath + "/team_" + fileCount + ".txt",
              jsonData,
              (err) => {}
            );
          }
        }
      } catch (error) {
        continue;
      }
      fileCount++;
    }
  }
  return res.status(data.status).send(data.message);
});

const formatAsTable = async (data, topicName, dateRange) => {
  // Find the maximum width of each column
  const columnWidths = {};
  for (const entry of data) {
    for (const key in entry) {
      const value = entry[key].toString();
      if (!columnWidths[key] || value.length > columnWidths[key]) {
        columnWidths[key] = value.length;
      }
    }
  }

  // Generate the table header
  const header = Object.keys(data[0])
    .map((key) => key.padEnd(columnWidths[key]))
    .join(" | ");

  // Generate the table content
  const content = data
    .map((entry) =>
      Object.values(entry)
        .map((value) =>
          value
            .toString()
            .padEnd(
              columnWidths[
                Object.keys(entry)[Object.values(entry).indexOf(value)]
              ]
            )
        )
        .join(" | ")
    )
    .join("\n");

  return `Topic: ${topicName}\nDate Range:${dateRange}\n\n${header}\n${"-".repeat(
    header.length
  )}\n${content}`;
};

const timeConverter = async (UNIX_timestamp, flag = false) => {
  if (flag) {
    var a = new Date(UNIX_timestamp * 1000 - 4 * 60 * 60 * 1000);
  } else {
    var a = new Date(UNIX_timestamp * 1000);
  }
  var months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate() < 10 ? "0" + a.getDate() : a.getDate();
  var hour = a.getHours() < 10 ? "0" + a.getHours() : a.getHours();
  var min = a.getMinutes() < 10 ? "0" + a.getMinutes() : a.getMinutes();
  var sec = a.getSeconds() < 10 ? "0" + a.getSeconds() : a.getSeconds();
  var time =
    date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
  return time;
};

module.exports = router;

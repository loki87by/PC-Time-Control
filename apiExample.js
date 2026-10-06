import express from "express";
import { exec } from "child_process";
import util from "util";
import { LOG } from "ansi-js-logger";

const app = express();
const execPromise = util.promisify(exec);

async function getFrpLogs() {
  try {
    const { stdout, stderr } = await execPromise(
      "systemctl status frp-server --lines 10",
    );

    if (stderr) {
      LOG.error("error:" + String(stderr));
      return String(stderr);
    }
    const arr = stdout.split("\n");
    const fil = arr.filter((i) => i.length);
    const isActiveInd = fil.findIndex((i) => i.includes("Active"));

    if (isActiveInd < 0) {
      return "Не найдено строки об активности...";
    }
    try {
      const activeStr = fil[isActiveInd];
      const dateStr = activeStr
        .replace(/.* since/gi, "")
        .replace(/ \D*;.*/gi, "")
        .trim();
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      return diff;
    } catch (er) {
      return String(er);
    }
  } catch (error) {
    return `Failed to get logs: ${error.message}`;
  }
}

async function restartFrpc() {
  try {
    const { stdout, stderr } = await execPromise(
      "systemctl restart frp-server --lines 10",
    );

    if (stderr) {
      LOG.error("error:" + String(stderr));
      return String(stderr);
    }
    const arr = stdout.split("\n");
    const fil = arr.filter((i) => i.length);
    const isActiveInd = fil.findIndex((i) => i.includes("Active"));

    if (isActiveInd < 0) {
      return "Не найдено строки об активности...";
    }
    return true;
  } catch (error) {
    return `Failed to get logs: ${error.message}`;
  }
}

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  next();
});

app.get("/get_frp_start_time", async (_, res) => {
  const result = await getFrpLogs();

  if (result == null) {
    return res.status(404).json({
      error: "Данные не найдены или операция не выполнена",
    });
  }

  res.json({
    success: !result?.error,
    data: result,
  });
});

app.get("/restart_frp_service", async (_, res) => {
  const data = await restartFrpc();
  res.json({
    success: typeof data === "boolean",
    data,
  });
});

app.listen(5000, () => {
  console.log("API server running on port 5000");
});

import dotenv from "dotenv";
import { CONFIG } from "../setup/config.js";
import { PATHS } from "../utils/consts.js";

dotenv.config();

export class FrpConnectManager {
  constructor() {
    this.cookie = null;
    this.id = null;
    this.token = null;
    this.tryCount = 0;
    this.description = "test" // variable may be empty
    this.name = process.env.NAME;
    this.redirectConfig = {
      name: "web-panel", // variable name
      direction: "forward", // NOT CHANGE!
      proxy_type: "tcp", // NOT CHANGE!
      remote_ip: PATHS.localhost,
      local_ip: PATHS.localhost,
      remote_port: CONFIG.interfacePort,
      local_port: CONFIG.webPort,
    };
  }

  async login() {
    const loginRes = await fetch(`${process.env.IP}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: process.env.FRP_ADMIN,
        password: process.env.PASS,
      }),
      redirect: "manual",
    });

    if (!loginRes || !loginRes.headers) return 0;
    const setCookie = loginRes.headers.getSetCookie();
    this.cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    return loginRes.status;
  }

  async addClient() {
    await fetch(`${process.env.IP}/clients/new`, {
      method: "POST",
      headers: { Cookie: this.cookie },
      body: new URLSearchParams({ name: this.name, description: this.description }),
      redirect: "manual",
    });
    return true;
  }

  async getToken() {
    const clientRes = await fetch(`${process.env.IP}/clients/${this.id}`, {
      headers: { Cookie: this.cookie },
      redirect: "manual",
    });
    const text = await clientRes.text();
    const arr = text.split("\n");
    const startInd = arr.findIndex((i) => i.includes("<code "));
    const lastInd = arr.findIndex((i) => i.includes("</code>"));
    const currStr = arr
      .slice(startInd, lastInd + 1)
      .map((i) => i.trim())
      .join(" ");
    this.token = currStr.replace(/<\/?code[^>]*>/g, "");
  }

  async getClient() {
    const clientsRes = await fetch(`${process.env.IP}/clients`, {
      headers: { Cookie: this.cookie },
      redirect: "manual",
    });
    const text = await clientsRes.text();
    const arr = text
      .split("\n")
      .filter(
        (i) =>
          i.includes('<a href="/clients/') ||
          (i.includes("<td>") && i.includes("</td>")),
      )
      .map((i) => i.trim());
    const fId = arr.findIndex((i) => i.includes(`<td>${this.name}</td>`));

    if (fId < 0 && this.tryCount < 5) {
      await this.addClient();
      this.tryCount++;
      return this.getClient();
    } else {
      this.tryCount = 0;
      const fHref = arr.slice(fId).findIndex((i) => i.includes("a href")) + fId;
      const lId =
        arr
          .slice(fHref)
          .findIndex((i) => i.includes("<td>") && i.includes("</td>")) + fHref;
      const currArr = arr.slice(fId, lId);
      const id = +currArr
        .find((i) => i.includes("a href"))
        .replace('<a href="/clients/', "")
        .replace(/".*/gi, "");
      this.id = id;
      this.redirectConfig.name = this.redirectConfig.name + id;
      this.redirectConfig.client_id = id;
    }
  }

  async getCurrentToken() {
    if (!this.cookie) await this.login();
    if (!this.id) await this.getClient();
    if (!this.token) await this.getToken();
    return this.token;
  }

  async addRedirect() {
    await fetch(`${process.env.IP}/port-forwards/new`, {
      method: "POST",
      headers: { Cookie: this.cookie },
      body: new URLSearchParams(this.redirectConfig),
      redirect: "manual",
    });
    return true;
  }
}

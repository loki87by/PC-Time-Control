
import dotenv from "dotenv";

dotenv.config();

export default class FrpConnectManager {
  constructor() {
    this.cookie = null;
    this.id = null;
    this.token = null;
    this.tryCount = 0;
    this.name = process.env.NAME;
  }

  async login() {
    const loginRes = await fetch(`${process.env.IP}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: process.env.USER, password: process.env.PASS }),
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
      body: new URLSearchParams({ name: this.name, description: "admin" }),
      redirect: "manual",
    });
    return true;
  }

  async getToken() {
    const clientRes = await fetch(
      `${process.env.IP}/clients/${this.id}`,
      {
        headers: { Cookie: this.cookie },
        redirect: "manual",
      },
    );
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
      this.id = +currArr
        .find((i) => i.includes("a href"))
        .replace('<a href="/clients/', "")
        .replace(/".*/gi, "");
    }
  }

  async getCurrentToken() {
    if (!this.cookie) await this.login()
    if (!this.id) await this.getClient()
    if (!this.token) await this.getToken()
    return this.token
  }
}

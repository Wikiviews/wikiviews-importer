import { Client } from "elasticsearch";

export function getDBClient(addr, port) {
 return new Client({host: `${addr}:${port}`});
}
import { Client } from "elasticsearch";

export function getESClient(addr, port) {
 return new Client({host: `${addr}:${port}`});
}
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const authHandler = toNextJsHandler(auth);

export const GET = authHandler.GET;
export const POST = authHandler.POST;

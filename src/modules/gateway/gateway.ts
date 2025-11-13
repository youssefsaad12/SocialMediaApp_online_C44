import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { decodedToken, TokenEnum } from "../../utils/security/token.security";
import { IAuthSocket } from "./gateway.interface";
import { ChatGateway } from "../chat/chat.gateway";
import { BadRequestException } from "../../utils/response/error.response";

export const connectedSockets = new Map<string, string[]>();
let io: Server | undefined = undefined;

export const initializeIo = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use(async (socket: IAuthSocket, next) => {
    try {
      const { user, decoded } = await decodedToken({
        authorization: socket.handshake?.auth.authorization || "",
        tokenType: TokenEnum.access,
      });

      const userTabs = connectedSockets.get(user._id.toString()) || [];
      // console.log({ userTabs });

      userTabs.push(socket.id);
      connectedSockets.set(user._id.toString(), userTabs);

      socket.credentials = { user, decoded };
      next();
    } catch (error: any) {
      next(error);
    }
  });

  function disconnection(socket: IAuthSocket, io: Server) {
    socket.on("disconnect", () => {
      const userId = socket.credentials?.user._id?.toString() as string;

      const remainingTabs =
        connectedSockets
          .get(userId)
          ?.filter((tab: string) => tab !== socket.id) || [];

      if (remainingTabs.length) {
        connectedSockets.set(userId, remainingTabs);
      } else {
        connectedSockets.delete(userId);
        getIo().emit("offline_user", userId);
      }

      // console.log(`a user disconnected from: ${socket.id}`);
      // console.log({ "After logout": connectedSockets });
    });
  }

  const chatGateway = new ChatGateway();

  io.on("connection", (socket: IAuthSocket) => {
    console.log(`a user connected to: ${socket.id}`);
    chatGateway.register(socket, getIo());
    disconnection(socket, getIo());
  });
};

export const getIo = (): Server => {
  if (!io) {
    throw new BadRequestException("Socket.io not initialized");
  }
  return io;
};

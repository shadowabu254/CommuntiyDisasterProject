import db from "../models/index.js";

export const chatSocket = (io) => {
  const onlineUsers = new Map(); // userId (number) -> socketId

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ── User comes online ──────────────────────────────────────────
    socket.on("join", (userId) => {
      const uid = parseInt(userId, 10);
      onlineUsers.set(uid, socket.id);
      socket.userId = uid;
      io.emit("presence", Array.from(onlineUsers.keys()));
      console.log(`User ${uid} online`);
    });

    // ── Join report room ───────────────────────────────────────────
    socket.on("joinRoom", (roomId) => {
      socket.join(`report_${roomId}`);
    });

    // ── Send message ───────────────────────────────────────────────
    socket.on("sendMessage", async (data) => {
      const {
        tempId,
        senderId,
        receiverId,
        reportId  = null,
        message   = null,
        fileUrl   = null,
        fileName  = null,
        fileType  = null,
        replyToId = null,
      } = data;

      try {
        // Persist to DB using Sequelize model
        const saved = await db.Message.create({
          senderId:   parseInt(senderId,   10),
          receiverId: parseInt(receiverId, 10),
          reportId:   reportId ? parseInt(reportId, 10) : null,
          message,
          fileUrl,
          fileName,
          fileType,
          replyToId:  replyToId ? parseInt(replyToId, 10) : null,
          status:     "sent",
        });

        const messageData = {
          id:         saved.id,
          tempId,
          senderId:   saved.senderId,
          receiverId: saved.receiverId,
          reportId:   saved.reportId,
          message:    saved.message,
          fileUrl:    saved.fileUrl,
          fileName:   saved.fileName,
          fileType:   saved.fileType,
          replyToId:  saved.replyToId,
          status:     "sent",
          createdAt:  saved.createdAt,
        };

        // Confirm to sender
        socket.emit("messageSent", messageData);

        // Deliver to receiver if online
        const receiverSocketId = onlineUsers.get(parseInt(receiverId, 10));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", messageData);

          // Mark as delivered
          await db.Message.update(
            { status: "delivered" },
            { where: { id: saved.id } }
          );
          messageData.status = "delivered";
          socket.emit("messageSent", messageData); // update sender's tick
        }

        // Broadcast to report room if applicable
        if (reportId) {
          socket.to(`report_${reportId}`).emit("receiveMessage", messageData);
        }

      } catch (err) {
        console.error("sendMessage error:", err.message);
        socket.emit("messageError", { error: "Failed to send message", tempId });
      }
    });

    // ── Typing indicator ───────────────────────────────────────────
    socket.on("typing", ({ receiverId, isTyping }) => {
      const rid = parseInt(receiverId, 10);
      const receiverSocketId = onlineUsers.get(rid);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", {
          userId: socket.userId,
          isTyping,
        });
      }
    });

    // ── Mark as read ───────────────────────────────────────────────
    socket.on("markAsRead", async ({ messageIds }) => {
      if (!messageIds?.length) return;
      try {
        await db.Message.update(
          { status: "read" },
          { where: { id: messageIds } }
        );

        // Notify each original sender
        const messages = await db.Message.findAll({
          where: { id: messageIds },
          attributes: ["id", "senderId"],
        });

        const senderGroups = {};
        messages.forEach((m) => {
          if (!senderGroups[m.senderId]) senderGroups[m.senderId] = [];
          senderGroups[m.senderId].push(m.id);
        });

        for (const [senderId, ids] of Object.entries(senderGroups)) {
          const senderSocketId = onlineUsers.get(parseInt(senderId, 10));
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", { messageIds: ids });
          }
        }
      } catch (err) {
        console.error("markAsRead error:", err.message);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("presence", Array.from(onlineUsers.keys()));
        console.log(`User ${socket.userId} disconnected`);
      }
    });
  });
};
import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import os from "os";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("Client connected to terminal socket");
    
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    const ptyProcess = spawn(shell, [], {
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
    });

    ptyProcess.stdout.on("data", (data) => {
      socket.emit("terminal:data", data.toString());
    });

    ptyProcess.stderr.on("data", (data) => {
      socket.emit("terminal:data", data.toString());
    });

    socket.on("terminal:write", (data) => {
      ptyProcess.stdin.write(data + "\n");
    });

    socket.on("disconnect", () => {
      ptyProcess.kill();
    });
  });

  app.use(express.json());
  app.use(cookieParser());

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const APP_URL = process.env.APP_URL || "http://localhost:3000";

  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

  // API: Get Google Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "MISSING_CREDENTIALS",
        message: "Google Client ID or Secret not configured in environment variables."
      });
    }

    const redirectUri = `${APP_URL}/auth/google/callback`;
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
      redirect_uri: redirectUri,
    });

    res.json({ url });
  });

  // OAuth Callback
  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${APP_URL}/auth/google/callback`;

    try {
      const { tokens } = await client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });

      // In a real app, you'd verify the ID token and create a session
      // For this demo, we'll just set a cookie
      res.cookie("auth_session", "verified", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 3600000, // 1 hour
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // API: Check Auth Status
  app.get("/api/auth/status", (req, res) => {
    const session = req.cookies.auth_session;
    res.json({ isAuthenticated: session === "verified" });
  });

  // API: Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_session", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

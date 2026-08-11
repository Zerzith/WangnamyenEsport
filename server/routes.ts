import type { Express } from "express";
import { createServer, type Server } from "http";
import { initializeFirebaseAdmin, db, auth } from "./firebase-admin";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Firebase Admin
  try {
    initializeFirebaseAdmin();
    log("Firebase Admin SDK initialized");
  } catch (error) {
    log("Warning: Firebase Admin SDK not available", "firebase");
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const snapshot = await db().collection("users").get();
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const doc = await db().collection("users").doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user role (admin only)
  app.put("/api/users/:id/role", async (req, res) => {
    try {
      const { role } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);

      // Check if user is admin
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Update role
      await db().collection("users").doc(req.params.id).update({ role });
      res.json({ success: true, message: "Role updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all teams
  app.get("/api/teams", async (req, res) => {
    try {
      const snapshot = await db().collection("teams").get();
      const teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get team by ID
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const doc = await db().collection("teams").doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Approve team (admin only)
  app.put("/api/teams/:id/approve", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);

      // Check if user is admin
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Update team status
      await db().collection("teams").doc(req.params.id).update({ 
        status: "approved",
        approvedAt: new Date().toISOString()
      });
      res.json({ success: true, message: "Team approved" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reject team (admin only)
  app.put("/api/teams/:id/reject", async (req, res) => {
    try {
      const { reason } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);

      // Check if user is admin
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Update team status
      await db().collection("teams").doc(req.params.id).update({ 
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      });
      res.json({ success: true, message: "Team rejected" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const snapshot = await db().collection("events").get();
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all matches
  app.get("/api/matches", async (req, res) => {
    try {
      const snapshot = await db().collection("matches").get();
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update match score (admin only)
  app.put("/api/matches/:id/score", async (req, res) => {
    try {
      const { scoreA, scoreB, status } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);

      // Check if user is admin
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Update match
      const updateData: any = {};
      if (scoreA !== undefined) updateData.scoreA = scoreA;
      if (scoreB !== undefined) updateData.scoreB = scoreB;
      if (status) updateData.status = status;

      await db().collection("matches").doc(req.params.id).update(updateData);
      res.json({ success: true, message: "Match updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user from Firebase Auth (admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Delete from Firebase Auth
      await auth().deleteUser(req.params.id);
      // Delete from Firestore
      await db().collection("users").doc(req.params.id).delete();
      res.json({ success: true, message: "User deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all Firebase Auth users (admin only)
  app.get("/api/admin/auth-users", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      const listUsersResult = await auth().listUsers(100);
      const authUsers = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        disabled: user.disabled,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      }));
      res.json(authUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Disable/Enable user in Firebase Auth (admin only)
  app.put("/api/admin/users/:id/disable", async (req, res) => {
    try {
      const { disabled } = req.body;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      await auth().updateUser(req.params.id, { disabled: disabled ?? true });
      res.json({ success: true, message: `User ${disabled ? 'disabled' : 'enabled'}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete chat message (admin only)
  app.delete("/api/chat/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token
      const token = authHeader.split("Bearer ")[1];
      const decodedToken = await auth().verifyIdToken(token);

      // Check if user is admin
      const adminDoc = await db().collection("users").doc(decodedToken.uid).get();
      if (adminDoc.data()?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Delete message
      await db().collection("live_chat").doc(req.params.id).delete();
      res.json({ success: true, message: "Message deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { createGitHubRepo, pushFileToRepo, getGitHubUser } from "./github-push";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Download endpoint for source code export (text file)
  app.get("/api/download-source", (req, res) => {
    const filePath = path.join(process.cwd(), "chevy-350-engine-source.txt");
    
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=chevy-350-engine-source.txt");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("File not found");
    }
  });

  // Download endpoint for VS Code project (zip file)
  app.get("/api/download-project", (req, res) => {
    const filePath = path.join(process.cwd(), "chevy-350-vscode-project.zip");
    
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=chevy-350-vscode-project.zip");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("File not found");
    }
  });

  // Push to GitHub endpoint - pushes ALL source files
  app.post("/api/push-to-github", async (req, res) => {
    try {
      const repoName = "chevy-350-v8-engine-viewer";
      const description = "Interactive 3D Chevy 350 Small Block V8 engine visualization with physics-based thermodynamic simulation";
      
      const { repo, owner } = await createGitHubRepo(repoName, description);
      
      const filesToPush = [
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
        "tailwind.config.ts",
        "drizzle.config.ts",
        "VSCODE-SETUP-README.md",
        "shared/schema.ts",
        "script/build.ts",
        "server/index.ts",
        "server/routes.ts",
        "server/storage.ts",
        "server/vite.ts",
        "server/static.ts",
        "server/github-push.ts",
        "client/index.html",
        "client/src/main.tsx",
        "client/src/App.tsx",
        "client/src/index.css",
        "client/src/pages/not-found.tsx",
        "client/src/hooks/use-is-mobile.tsx",
        "client/src/lib/utils.ts",
        "client/src/lib/queryClient.ts",
        "client/src/lib/stores/useEngine.tsx",
        "client/src/lib/stores/usePhysicsEngine.tsx",
        "client/src/lib/stores/useGame.tsx",
        "client/src/lib/stores/useAudio.tsx",
        "client/src/lib/physics/EnginePhysics.ts",
        "client/src/lib/physics/StarterMotor.ts",
        "client/src/lib/physics/Carburetor.ts",
        "client/src/lib/physics/RingSealing.ts",
        "client/src/lib/physics/MaterialProperties.ts",
        "client/src/lib/specs/SBC350Specifications.ts",
        "client/src/components/game/AnimatedV8Engine.tsx",
        "client/src/components/game/EngineViewer.tsx",
        "client/src/components/game/ThrottleControl.tsx",
        "client/src/components/game/RPMGauge.tsx",
        "client/src/components/game/IgnitionSwitch.tsx",
        "client/src/components/game/PhysicsTelemetry.tsx",
        "client/src/components/game/ControlsGuide.tsx",
        "client/src/components/game/DebugToggle.tsx",
        "client/src/components/game/LoadControl.tsx",
        "client/src/components/game/ViewPresets.tsx",
        "client/src/components/game/XRayToggle.tsx",
        "client/src/components/game/CadModeToggle.tsx",
        "client/src/components/game/BlockVisibilityToggle.tsx",
        "client/src/components/game/CollapsiblePanel.tsx",
        "client/src/components/game/DimensionalReport.tsx",
        "client/src/components/game/FinalAuditPanel.tsx",
        "client/src/components/game/SceneMaterialOverride.tsx",
        "client/src/components/game/MaterialPresetPanel.tsx",
        "client/src/components/ui/accordion.tsx",
        "client/src/components/ui/alert-dialog.tsx",
        "client/src/components/ui/alert.tsx",
        "client/src/components/ui/aspect-ratio.tsx",
        "client/src/components/ui/avatar.tsx",
        "client/src/components/ui/badge.tsx",
        "client/src/components/ui/breadcrumb.tsx",
        "client/src/components/ui/button.tsx",
        "client/src/components/ui/calendar.tsx",
        "client/src/components/ui/card.tsx",
        "client/src/components/ui/carousel.tsx",
        "client/src/components/ui/chart.tsx",
        "client/src/components/ui/checkbox.tsx",
        "client/src/components/ui/collapsible.tsx",
        "client/src/components/ui/command.tsx",
        "client/src/components/ui/context-menu.tsx",
        "client/src/components/ui/dialog.tsx",
        "client/src/components/ui/drawer.tsx",
        "client/src/components/ui/dropdown-menu.tsx",
        "client/src/components/ui/form.tsx",
        "client/src/components/ui/hover-card.tsx",
        "client/src/components/ui/input-otp.tsx",
        "client/src/components/ui/input.tsx",
        "client/src/components/ui/interface.tsx",
        "client/src/components/ui/label.tsx",
        "client/src/components/ui/menubar.tsx",
        "client/src/components/ui/navigation-menu.tsx",
        "client/src/components/ui/pagination.tsx",
        "client/src/components/ui/popover.tsx",
        "client/src/components/ui/progress.tsx",
        "client/src/components/ui/radio-group.tsx",
        "client/src/components/ui/resizable.tsx",
        "client/src/components/ui/scroll-area.tsx",
        "client/src/components/ui/select.tsx",
        "client/src/components/ui/separator.tsx",
        "client/src/components/ui/sheet.tsx",
        "client/src/components/ui/sidebar.tsx",
        "client/src/components/ui/skeleton.tsx",
        "client/src/components/ui/slider.tsx",
        "client/src/components/ui/sonner.tsx",
        "client/src/components/ui/switch.tsx",
        "client/src/components/ui/table.tsx",
        "client/src/components/ui/tabs.tsx",
        "client/src/components/ui/textarea.tsx",
        "client/src/components/ui/toggle-group.tsx",
        "client/src/components/ui/toggle.tsx",
        "client/src/components/ui/tooltip.tsx",
      ];
      
      let pushed = 0;
      for (const file of filesToPush) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          await pushFileToRepo(owner, repoName, file, content, `Update ${file}`);
          pushed++;
        }
      }
      
      res.json({ 
        success: true, 
        repoUrl: repo.html_url,
        message: `Pushed ${pushed} files to GitHub`
      });
    } catch (error: any) {
      console.error("GitHub push error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get GitHub user info
  app.get("/api/github-user", async (req, res) => {
    try {
      const user = await getGitHubUser();
      res.json({ login: user.login, name: user.name, avatar: user.avatar_url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

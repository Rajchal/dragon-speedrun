import {
    ACTOR_DIR_ROW,
    DRAGON_FRAMES,
    DRAGON_FRAME_MS,
    DRAGON_PINGPONG,
    Dir,
    DRAGON_TILES_H,
    DRAGON_TILES_W,
    SPRITE_PX,
    TILE_COLORS,
    TILE_PX,
    VIEWPORT_HEIGHT_PX,
    VIEWPORT_TILES_X,
    VIEWPORT_TILES_Y,
    VIEWPORT_WIDTH_PX,
    WORLD_HEIGHT,
    WORLD_WIDTH,
} from "./constants";
import { currentFrame, directionRow, gameState } from "./state";
import { Controls } from "./types";
import { SpriteSheets, drawActorFrame, drawDragonFrame } from "./sprites";

let renderScale = 1;
let minimapScale = 1;
const ACTOR_DRAW_W = TILE_PX;
const ACTOR_DRAW_H = 24;
const ACTOR_HEAD_GAP = ACTOR_DRAW_H - TILE_PX;
const MINIMAP_BASE_SIZE = 140;
const MINIMAP_VIEW_TILES = 56;

export function resizeCanvases(controls: Controls) {
    const dpr = window.devicePixelRatio || 1;
    const maxFit = Math.min(window.innerWidth / VIEWPORT_WIDTH_PX, window.innerHeight / VIEWPORT_HEIGHT_PX);
    renderScale = Math.max(1, Math.min(maxFit, 4));

    controls.canvas.width = Math.round(VIEWPORT_WIDTH_PX * dpr * renderScale);
    controls.canvas.height = Math.round(VIEWPORT_HEIGHT_PX * dpr * renderScale);
    controls.canvas.style.width = `${VIEWPORT_WIDTH_PX * renderScale}px`;
    controls.canvas.style.height = `${VIEWPORT_HEIGHT_PX * renderScale}px`;

    // Minimap
    minimapScale = 1;
    controls.minimap.width = Math.round(MINIMAP_BASE_SIZE * dpr * minimapScale);
    controls.minimap.height = Math.round(MINIMAP_BASE_SIZE * dpr * minimapScale);
    controls.minimap.style.width = `${MINIMAP_BASE_SIZE * minimapScale}px`;
    controls.minimap.style.height = `${MINIMAP_BASE_SIZE * minimapScale}px`;
    gameState.minimapBase = null;
}

export function draw(controls: Controls, sprites: SpriteSheets) {
    if (!gameState.world) return;
    const c = controls.canvas;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(renderScale * dpr, 0, 0, renderScale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const tilesX = VIEWPORT_TILES_X;
    const tilesY = VIEWPORT_TILES_Y;

    const camX = gameState.renderYou.x - tilesX / 2;
    const camY = gameState.renderYou.y - tilesY / 2;
    const startX = Math.floor(camX);
    const startY = Math.floor(camY);
    const offsetX = -(camX - startX) * TILE_PX;
    const offsetY = -(camY - startY) * TILE_PX;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, VIEWPORT_WIDTH_PX, VIEWPORT_HEIGHT_PX);

    for (let r = 0; r <= tilesY; r++) {
        for (let col = 0; col <= tilesX; col++) {
            const wx = startX + col;
            const wy = startY + r;
            if (!gameState.world[0] || wx < 0 || wy < 0 || wy >= gameState.world.length || wx >= gameState.world[0].length)
                continue;
            const tile = gameState.world[wy][wx];
            const px = offsetX + col * TILE_PX;
            const py = offsetY + r * TILE_PX;
            if (sprites.readyTiles && sprites.tiles) {
                const map = tileSprite(tile);
                if (map) {
                    ctx.drawImage(
                        sprites.tiles,
                        map.sx * SPRITE_PX,
                        map.sy * SPRITE_PX,
                        SPRITE_PX,
                        SPRITE_PX,
                        px,
                        py,
                        TILE_PX,
                        TILE_PX,
                    );
                    continue;
                }
            }
            ctx.fillStyle = TILE_COLORS[tile] ?? "#333";
            ctx.fillRect(px, py, TILE_PX, TILE_PX);
        }
    }

    if (gameState.dragon) {
        const dx = (gameState.dragon.x - camX) * TILE_PX;
        const dy = (gameState.dragon.y - camY) * TILE_PX;
        const dw = gameState.dragon.w * TILE_PX || DRAGON_TILES_W * TILE_PX;
        const dh = gameState.dragon.h * TILE_PX || DRAGON_TILES_H * TILE_PX;
        const dragonDir = dragonFacingPlayer();
        const frame = currentDragonFrame();
        const row = ACTOR_DIR_ROW[dragonDir];
        const drawn = drawDragonFrame(ctx, sprites, frame, row, dx, dy, dw, dh);
        if (!drawn && sprites.readyDragon && sprites.dragon) {
            ctx.drawImage(sprites.dragon, 0, 0, sprites.dragon.width, sprites.dragon.height, dx, dy, dw, dh);
        } else if (!drawn) {
            ctx.fillStyle = "rgba(220,38,38,0.45)";
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.fillRect(dx, dy, dw, dh);
            ctx.strokeRect(dx, dy, dw, dh);
        }
    }

    drawOpponent(ctx, sprites, camX, camY);
    drawYou(ctx, sprites, camX, camY);

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("YOU", (gameState.renderYou.x - camX) * TILE_PX, (gameState.renderYou.y - camY) * TILE_PX - TILE_PX - 2);

    drawMiniMap(controls, sprites);
}

function currentDragonFrame() {
    if (DRAGON_FRAMES <= 1) return 0;
    const step = Math.floor(performance.now() / DRAGON_FRAME_MS);
    if (!DRAGON_PINGPONG) return step % DRAGON_FRAMES;
    const period = DRAGON_FRAMES * 2 - 2;
    const idx = step % period;
    return idx < DRAGON_FRAMES ? idx : period - idx;
}

function dragonFacingPlayer(): Dir {
    if (!gameState.dragon) return "Down";
    const dragonCenterX = gameState.dragon.x + gameState.dragon.w / 2;
    const dragonCenterY = gameState.dragon.y + gameState.dragon.h / 2;
    const dx = gameState.you.x - dragonCenterX;
    const dy = gameState.you.y - dragonCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
        return dx >= 0 ? "Right" : "Left";
    }
    return dy >= 0 ? "Down" : "Up";
}

function drawYou(ctx: CanvasRenderingContext2D, sprites: SpriteSheets, camX: number, camY: number) {
    const frame = currentFrame(gameState.anim.you);
    const row = directionRow(gameState.anim.you);
    const drawX = (gameState.renderYou.x - camX) * TILE_PX;
    const drawY = (gameState.renderYou.y - camY) * TILE_PX - ACTOR_HEAD_GAP;
    const drawn = drawActorFrame(
        ctx,
        sprites,
        frame,
        row,
        drawX,
        drawY,
        ACTOR_DRAW_W,
        ACTOR_DRAW_H,
    );
    if (!drawn) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(drawX, drawY, ACTOR_DRAW_W, ACTOR_DRAW_H);
    }
}

function drawOpponent(ctx: CanvasRenderingContext2D, sprites: SpriteSheets, camX: number, camY: number) {
    const frame = currentFrame(gameState.anim.opp);
    const row = directionRow(gameState.anim.opp);
    const drawX = (gameState.renderOpp.x - camX) * TILE_PX;
    const drawY = (gameState.renderOpp.y - camY) * TILE_PX - ACTOR_HEAD_GAP;
    const drawn = drawActorFrame(
        ctx,
        sprites,
        frame,
        row,
        drawX,
        drawY,
        ACTOR_DRAW_W,
        ACTOR_DRAW_H,
    );
    if (!drawn) {
        ctx.fillStyle = "#a855f7";
        ctx.fillRect(drawX, drawY, ACTOR_DRAW_W, ACTOR_DRAW_H);
    }
}

function drawMiniMap(controls: Controls, sprites: SpriteSheets) {
    if (!gameState.world) return;
    const ctx = controls.minimap.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const mw = controls.minimap.width;
    const mh = controls.minimap.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(15, 19, 26, 0.35)";
    ctx.fillRect(0, 0, mw, mh);

    const viewX = MINIMAP_VIEW_TILES;
    const viewY = MINIMAP_VIEW_TILES;
    const sx = mw / viewX;
    const sy = mh / viewY;

    const camX = gameState.you.x - viewX / 2;
    const camY = gameState.you.y - viewY / 2;
    const startX = Math.floor(camX);
    const startY = Math.floor(camY);
    const fracX = camX - startX;
    const fracY = camY - startY;

    for (let y = 0; y <= viewY; y++) {
        for (let x = 0; x <= viewX; x++) {
            const wx = startX + x;
            const wy = startY + y;
            if (wx < 0 || wy < 0 || wy >= WORLD_HEIGHT || wx >= WORLD_WIDTH) continue;
            const tile = gameState.world[wy]?.[wx] ?? "Grass";
            ctx.fillStyle = TILE_COLORS[tile] ?? "#333";
            ctx.fillRect((x - fracX) * sx, (y - fracY) * sy, Math.ceil(sx), Math.ceil(sy));
        }
    }

    if (gameState.dragon) {
        ctx.fillStyle = "rgba(239,68,68,0.8)";
        ctx.fillRect(
            (gameState.dragon.x - camX) * sx,
            (gameState.dragon.y - camY) * sy,
            Math.max(1, gameState.dragon.w * sx),
            Math.max(1, gameState.dragon.h * sy),
        );
    }

    drawMinimapArrow(
        ctx,
        (gameState.opp.x - camX + 0.5) * sx,
        (gameState.opp.y - camY + 0.5) * sy,
        gameState.opp.dir,
        "#a855f7",
        Math.max(4, Math.min(sx, sy) * 1.2),
    );

    drawMinimapArrow(
        ctx,
        (gameState.you.x - camX + 0.5) * sx,
        (gameState.you.y - camY + 0.5) * sy,
        gameState.you.dir,
        "#fbbf24",
        Math.max(4, Math.min(sx, sy) * 1.35),
    );
}

function drawMinimapArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, color: string, size: number) {
    const angle = dir === "Up" ? -Math.PI / 2 : dir === "Right" ? 0 : dir === "Down" ? Math.PI / 2 : Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function tileSprite(tile: string) {
    const map: Record<string, { sx: number; sy: number }> = {
        // Sheet columns: 0=Water, 1=Sand, 2=Grass, 3=Wall, 4=Forest (row 0)
        Water: { sx: 1, sy: 0 },
        Sand: { sx: 4, sy: 0 },
        Grass: { sx: 0, sy: 0 },
        Wall: { sx: 2, sy: 0 },
        Forest: { sx: 3, sy: 0 },
    };
    return map[tile];
}

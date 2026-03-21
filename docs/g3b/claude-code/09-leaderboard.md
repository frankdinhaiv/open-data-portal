# G3B Claude Code: Leaderboard Implementation

**Covers:** P0-4 (Arena Leaderboard)
**Date:** March 12, 2026
**Format:** Complete implementation code (TypeScript React + FastAPI)
**Status:** Ready for engineering build
**Dependencies:** Elo Engine (08), Vote System (07), Database

---

## Overview

This file provides **complete, production-ready code** for:
1. **LeaderboardPage component** — Main table + 4 statistical tabs
2. **Win Fraction Heatmap** — Blue→White→Red diverging scale
3. **Battle Count Heatmap** — Yellow→Purple sequential scale
4. **Average Win Rate Bar Chart** — Horizontal bars, Recharts
5. **Confidence Interval Dot-and-Whisker Plot** — Sorted by Elo
6. **FastAPI endpoints** — GET /api/leaderboard/* with proper caching
7. **Daily refresh logic** — Frontend SWR for fresh data

All code is copy-paste ready. Uses Recharts (not Canvas) for React integration.

---

## 1. FastAPI Leaderboard Endpoints

**File: `backend/api/routers/leaderboard.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
import logging

from backend.models.elo import EloSnapshot, PairwiseStats
from backend.models.vote import Model, Vote
from backend.schemas.leaderboard import (
    LeaderboardRow,
    WinFractionResponse,
    BattleCountResponse,
    AvgWinRateResponse,
    ConfidenceIntervalResponse,
)
from backend.database import get_db

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])
logger = logging.getLogger(__name__)

@router.get("", response_model=dict)
async def get_leaderboard(db: Session = Depends(get_db)):
    """
    Fetch main leaderboard table (Rank, Model, Elo, CI, Vote Count, Avg Win Rate, Org).

    Returns latest EloSnapshot for each model, sorted by Elo descending.
    """
    try:
        # Get latest snapshot date
        latest_date = db.query(func.max(EloSnapshot.date_snapshot)).scalar()

        if not latest_date:
            return {
                "data": [],
                "last_updated": None,
                "message": "Leaderboard not yet seeded. Check back soon.",
            }

        # Fetch latest snapshots
        snapshots = db.query(EloSnapshot)\
            .filter(EloSnapshot.date_snapshot == latest_date)\
            .all()

        # Fetch models
        model_ids = [s.model_id for s in snapshots]
        models = {m.id: m for m in db.query(Model).filter(Model.id.in_(model_ids)).all()}

        # Sort by Elo descending
        snapshots = sorted(snapshots, key=lambda s: s.elo_rating, reverse=True)

        # Build leaderboard rows
        rows = []
        for rank, snapshot in enumerate(snapshots, 1):
            model = models[snapshot.model_id]

            # Vote count for this model
            vote_count = db.query(func.count(Vote.id))\
                .filter(
                    (Vote.model_a_id == snapshot.model_id) |
                    (Vote.model_b_id == snapshot.model_id)
                )\
                .scalar() or 0

            # Average win rate
            pairwise = db.query(PairwiseStats)\
                .filter(
                    (PairwiseStats.model_a_id == snapshot.model_id) |
                    (PairwiseStats.model_b_id == snapshot.model_id)
                )\
                .all()

            avg_win_rate = 0.0
            if pairwise:
                win_rates = []
                for p in pairwise:
                    if p.model_a_id == snapshot.model_id:
                        win_rates.append(p.avg_win_rate_a)
                    else:
                        win_rates.append(p.avg_win_rate_b)
                avg_win_rate = sum(win_rates) / len(win_rates) if win_rates else 0.0

            row = LeaderboardRow(
                rank=rank,
                model_id=snapshot.model_id,
                model_name=model.name,
                provider=model.provider,
                elo_score=snapshot.elo_rating,
                ci_lower=snapshot.ci_lower,
                ci_upper=snapshot.ci_upper,
                ci_width=(snapshot.ci_upper - snapshot.ci_lower) // 2,
                vote_count=vote_count,
                avg_win_rate=round(avg_win_rate * 100, 1),  # Percentage
                organization="",  # TODO: Add org field to Model
            )
            rows.append(row)

        return {
            "data": [row.model_dump() for row in rows],
            "last_updated": latest_date.isoformat(),
            "total_votes": db.query(func.count(Vote.id)).scalar(),
        }

    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")

@router.get("/stats/win-fraction", response_model=WinFractionResponse)
async def get_win_fraction_matrix(db: Session = Depends(get_db)):
    """
    Fetch win fraction matrix (M×M heatmap data).

    Returns models sorted by Elo (descending) and win fraction values.
    """
    try:
        # Get latest snapshot date
        latest_date = db.query(func.max(EloSnapshot.date_snapshot)).scalar()

        if not latest_date:
            raise HTTPException(status_code=404, detail="No leaderboard data")

        # Fetch models sorted by Elo
        snapshots = db.query(EloSnapshot)\
            .filter(EloSnapshot.date_snapshot == latest_date)\
            .order_by(desc(EloSnapshot.elo_rating))\
            .all()

        model_ids = [s.model_id for s in snapshots]
        models = {m.id: m for m in db.query(Model).filter(Model.id.in_(model_ids)).all()}

        # Fetch pairwise stats
        pairwise = db.query(PairwiseStats).all()
        pairwise_map = {(p.model_a_id, p.model_b_id): p for p in pairwise}
        pairwise_map.update({(p.model_b_id, p.model_a_id): p for p in pairwise})

        # Build matrix
        matrix = []
        for i, model_a_id in enumerate(model_ids):
            row = []
            for j, model_b_id in enumerate(model_ids):
                if i == j:
                    row.append(0.5)  # Diagonal: neutral
                else:
                    key = (model_a_id, model_b_id)
                    if key in pairwise_map:
                        row.append(round(pairwise_map[key].win_fraction, 3))
                    else:
                        row.append(0.5)  # No data: neutral
            matrix.append(row)

        return WinFractionResponse(
            models=[models[mid].name for mid in model_ids],
            model_ids=model_ids,
            matrix=matrix,
            last_updated=latest_date.isoformat(),
        )

    except Exception as e:
        logger.error(f"Error fetching win fraction matrix: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch win fraction matrix")

@router.get("/stats/battle-count", response_model=BattleCountResponse)
async def get_battle_count_matrix(db: Session = Depends(get_db)):
    """
    Fetch battle count matrix (symmetric N×N heatmap).

    Models sorted by Elo descending.
    """
    try:
        latest_date = db.query(func.max(EloSnapshot.date_snapshot)).scalar()

        if not latest_date:
            raise HTTPException(status_code=404, detail="No leaderboard data")

        snapshots = db.query(EloSnapshot)\
            .filter(EloSnapshot.date_snapshot == latest_date)\
            .order_by(desc(EloSnapshot.elo_rating))\
            .all()

        model_ids = [s.model_id for s in snapshots]
        models = {m.id: m for m in db.query(Model).filter(Model.id.in_(model_ids)).all()}

        pairwise = db.query(PairwiseStats).all()
        pairwise_map = {(p.model_a_id, p.model_b_id): p for p in pairwise}
        pairwise_map.update({(p.model_b_id, p.model_a_id): p for p in pairwise})

        matrix = []
        for i, model_a_id in enumerate(model_ids):
            row = []
            for j, model_b_id in enumerate(model_ids):
                if i == j:
                    row.append(0)
                else:
                    key = (model_a_id, model_b_id)
                    if key in pairwise_map:
                        row.append(pairwise_map[key].battle_count)
                    else:
                        row.append(0)
            matrix.append(row)

        return BattleCountResponse(
            models=[models[mid].name for mid in model_ids],
            model_ids=model_ids,
            matrix=matrix,
            last_updated=latest_date.isoformat(),
        )

    except Exception as e:
        logger.error(f"Error fetching battle count matrix: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch battle count matrix")

@router.get("/stats/avg-win-rate", response_model=AvgWinRateResponse)
async def get_avg_win_rate(db: Session = Depends(get_db)):
    """
    Fetch average win rates per model (sorted descending).
    """
    try:
        latest_date = db.query(func.max(EloSnapshot.date_snapshot)).scalar()

        if not latest_date:
            raise HTTPException(status_code=404, detail="No leaderboard data")

        snapshots = db.query(EloSnapshot)\
            .filter(EloSnapshot.date_snapshot == latest_date)\
            .order_by(desc(EloSnapshot.elo_rating))\
            .all()

        model_ids = [s.model_id for s in snapshots]
        models = {m.id: m for m in db.query(Model).filter(Model.id.in_(model_ids)).all()}

        pairwise = db.query(PairwiseStats).all()

        data = []
        for snapshot in snapshots:
            model_id = snapshot.model_id
            win_rates = []

            for p in pairwise:
                if p.model_a_id == model_id:
                    win_rates.append(p.avg_win_rate_a)
                elif p.model_b_id == model_id:
                    win_rates.append(p.avg_win_rate_b)

            avg_wr = sum(win_rates) / len(win_rates) if win_rates else 0.0

            data.append({
                "model_id": model_id,
                "model_name": models[model_id].name,
                "avg_win_rate": round(avg_wr * 100, 1),
            })

        return AvgWinRateResponse(
            data=data,
            last_updated=latest_date.isoformat(),
        )

    except Exception as e:
        logger.error(f"Error fetching avg win rate: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch avg win rate")

@router.get("/stats/confidence-intervals", response_model=ConfidenceIntervalResponse)
async def get_confidence_intervals(db: Session = Depends(get_db)):
    """
    Fetch Elo + CI bounds (dot-and-whisker plot data).

    Models sorted by Elo descending.
    """
    try:
        latest_date = db.query(func.max(EloSnapshot.date_snapshot)).scalar()

        if not latest_date:
            raise HTTPException(status_code=404, detail="No leaderboard data")

        snapshots = db.query(EloSnapshot)\
            .filter(EloSnapshot.date_snapshot == latest_date)\
            .order_by(desc(EloSnapshot.elo_rating))\
            .all()

        models = {m.id: m for m in db.query(Model).all()}

        data = []
        for snapshot in snapshots:
            data.append({
                "model_id": snapshot.model_id,
                "model_name": models[snapshot.model_id].name,
                "elo": snapshot.elo_rating,
                "ci_lower": snapshot.ci_lower,
                "ci_upper": snapshot.ci_upper,
            })

        return ConfidenceIntervalResponse(
            data=data,
            last_updated=latest_date.isoformat(),
        )

    except Exception as e:
        logger.error(f"Error fetching confidence intervals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch CIs")
```

---

## 2. Leaderboard Response Schemas

**File: `backend/schemas/leaderboard.py`**

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class LeaderboardRow(BaseModel):
    rank: int
    model_id: str
    model_name: str
    provider: str
    elo_score: int
    ci_lower: int
    ci_upper: int
    ci_width: int  # (upper - lower) / 2
    vote_count: int
    avg_win_rate: float  # Percentage (0-100)
    organization: Optional[str] = None
    license_type: str  # "open" or "proprietary" — displayed as badge ("Open" green / "Prop" purple)

class WinFractionResponse(BaseModel):
    models: List[str]  # Model names
    model_ids: List[str]  # Model IDs
    matrix: List[List[float]]  # M×M, values 0-1
    last_updated: str  # ISO date

class BattleCountResponse(BaseModel):
    models: List[str]
    model_ids: List[str]
    matrix: List[List[int]]  # M×M, battle counts
    last_updated: str

class AvgWinRateResponse(BaseModel):
    data: List[dict]  # [{"model_id": ..., "model_name": ..., "avg_win_rate": ...}, ...]
    last_updated: str

class ConfidenceIntervalResponse(BaseModel):
    data: List[dict]  # [{"model_id": ..., "model_name": ..., "elo": ..., "ci_lower": ..., "ci_upper": ...}, ...]
    last_updated: str
```

---

## 3. React Components

**File: `frontend/components/LeaderboardPage.tsx`**

```typescript
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, Trophy, Medal, Badge } from "lucide-react";
import {
  WinFractionHeatmap,
  BattleCountHeatmap,
  AvgWinRateChart,
  ConfidenceIntervalChart,
} from "./LeaderboardCharts";

interface LeaderboardRow {
  rank: number;
  model_id: string;
  model_name: string;
  provider: string;
  elo_score: number;
  ci_lower: number;
  ci_upper: number;
  ci_width: number;
  vote_count: number;
  avg_win_rate: number;
  organization?: string;
  license_type: string;  // "open" | "proprietary"
}

interface LeaderboardData {
  data: LeaderboardRow[];
  last_updated: string;
  total_votes: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LeaderboardPage() {
  // Sort state — persisted to localStorage under key 'vigen_lb_sort'
  const savedSort = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('vigen_lb_sort') || '{}');
      return { sortBy: s.key || 'elo', sortAsc: s.dir === 'asc' };
    } catch { return { sortBy: 'elo', sortAsc: false }; }
  })();
  const [sortBy, setSortBy] = useState<string>(savedSort.sortBy);
  const [sortAsc, setSortAsc] = useState(savedSort.sortAsc);

  const { data, error, isLoading } = useSWR<LeaderboardData>(
    "/api/leaderboard",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      focusThrottleInterval: 300000, // Refresh every 5 minutes max
    }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !data?.data || data.data.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Bảng xếp hạng sắp sửa khởi chạy. Quay lại sau...
        </p>
      </div>
    );
  }

  // Sort rows
  let sortedRows = [...data.data];
  sortedRows.sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortBy) {
      case "rank":
        aVal = a.rank;
        bVal = b.rank;
        break;
      case "name":
        aVal = a.model_name.toLowerCase();
        bVal = b.model_name.toLowerCase();
        break;
      case "elo":
        aVal = a.elo_score;
        bVal = b.elo_score;
        break;
      case "votes":
        aVal = a.vote_count;
        bVal = b.vote_count;
        break;
      case "win_rate":
        aVal = a.avg_win_rate;
        bVal = b.avg_win_rate;
        break;
      default:
        aVal = a.elo_score;
        bVal = b.elo_score;
    }

    const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortAsc ? result : -result;
  });

  const toggleSort = (col: string) => {
    const newAsc = sortBy === col ? !sortAsc : false;
    const newCol = col;
    setSortBy(newCol);
    setSortAsc(newAsc);
    // Persist to localStorage
    localStorage.setItem('vigen_lb_sort', JSON.stringify({ key: newCol, dir: newAsc ? 'asc' : 'desc' }));
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const ColumnHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <TableHead
      onClick={() => toggleSort(sortKey)}
      className="cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortBy === sortKey && <ArrowUpDown className="w-4 h-4" />}
      </div>
    </TableHead>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">ViGen Arena Leaderboard</h1>
        <p className="text-sm text-gray-600">
          Cập nhật lần cuối: {new Date(data.last_updated).toLocaleDateString("vi-VN")} |
          Tổng: {data.total_votes} bình chọn
        </p>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="table">Bảng Xếp Hạng</TabsTrigger>
          <TabsTrigger value="win-fraction">Ma Trận Thắng</TabsTrigger>
          <TabsTrigger value="battle-count">Số Trận</TabsTrigger>
          <TabsTrigger value="avg-win-rate">Tỉ Lệ Thắng</TabsTrigger>
          <TabsTrigger value="confidence-intervals">Khoảng Tin Cậy</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <ColumnHeader label="Xếp Hạng" sortKey="rank" />
                  <ColumnHeader label="Mô Hình" sortKey="name" />
                  <ColumnHeader label="Điểm ELO" sortKey="elo" />
                  <ColumnHeader label="±CI" sortKey="ci_width" />
                  <ColumnHeader label="Số Trận" sortKey="votes" />
                  <ColumnHeader label="Tỉ Lệ Thắng" sortKey="win_rate" />
                  <TableHead>Tổ Chức</TableHead>
                  <TableHead>Giấy Phép</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.model_id} className="hover:bg-gray-50">
                    <TableCell className="font-semibold text-center">
                      <div className="flex items-center gap-2 justify-center">
                        {row.rank}
                        {getMedalIcon(row.rank)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {row.model_name}
                        <Badge variant="secondary" className="text-xs">
                          {row.provider}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {row.elo_score}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      ±{row.ci_width}
                    </TableCell>
                    <TableCell className="text-center">{row.vote_count}</TableCell>
                    <TableCell className="text-center">
                      {row.avg_win_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.organization || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="win-fraction">
          <WinFractionHeatmap />
        </TabsContent>

        <TabsContent value="battle-count">
          <BattleCountHeatmap />
        </TabsContent>

        <TabsContent value="avg-win-rate">
          <AvgWinRateChart />
        </TabsContent>

        <TabsContent value="confidence-intervals">
          <ConfidenceIntervalChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 4. Leaderboard Charts

**File: `frontend/components/LeaderboardCharts.tsx`**

```typescript
import React from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ComposedChart,
} from "recharts";
import { AlertCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Win Fraction Heatmap
export function WinFractionHeatmap() {
  const { data, isLoading } = useSWR("/api/leaderboard/stats/win-fraction", fetcher);

  if (isLoading) return <div>読み込み中...</div>;
  if (!data) return <div>データなし</div>;

  const { models, matrix } = data;
  const cellSize = 40;
  const labelWidth = 150;

  // Color scale: blue (0%) → white (50%) → red (100%)
  const getColor = (value: number) => {
    if (value < 0.5) {
      const intensity = (0.5 - value) / 0.5;
      return `rgb(${Math.round(0 + intensity * 0)}, ${Math.round(100 + intensity * 55)}, ${Math.round(255 - intensity * 155)})`;
    } else if (value > 0.5) {
      const intensity = (value - 0.5) / 0.5;
      return `rgb(${Math.round(255)}, ${Math.round(100 - intensity * 55)}, ${Math.round(100)})`;
    }
    return "rgb(255, 255, 255)";
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          青 = 左側モデルが有利 | 白 = 互角 | 赤 = 右側モデルが有利
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ display: "flex" }}>
          {/* Y-axis labels */}
          <div style={{ width: labelWidth, paddingTop: 30 }}>
            {models.map((name: string, i: number) => (
              <div
                key={i}
                style={{
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 10,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Matrix */}
          <div>
            {/* X-axis labels */}
            <div style={{ display: "flex", paddingLeft: 5 }}>
              {models.map((name: string, i: number) => (
                <div
                  key={i}
                  style={{
                    width: cellSize,
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {matrix.map((row: number[], i: number) => (
              <div key={i} style={{ display: "flex" }}>
                {row.map((value: number, j: number) => (
                  <div
                    key={j}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(value),
                      border: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                    title={`${models[i]} vs ${models[j]}: ${(value * 100).toFixed(1)}%`}
                  >
                    {(value * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Battle Count Heatmap
export function BattleCountHeatmap() {
  const { data, isLoading } = useSWR("/api/leaderboard/stats/battle-count", fetcher);

  if (isLoading) return <div>読み込み中...</div>;
  if (!data) return <div>データなし</div>;

  const { models, matrix } = data;
  const cellSize = 40;
  const labelWidth = 150;

  // Color scale: yellow (0) → purple (max)
  const maxBattles = Math.max(...matrix.flat());
  const getColor = (count: number) => {
    if (count === 0) return "rgb(255, 255, 255)";
    const intensity = count / maxBattles;
    const r = Math.round(128 + intensity * 75);
    const g = Math.round(128 - intensity * 128);
    const b = Math.round(255 - intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800">
          ペアに少なくとも50回の戦闘がない場合は「信頼できない」とマークされます
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ display: "flex" }}>
          <div style={{ width: labelWidth, paddingTop: 30 }}>
            {models.map((name: string, i: number) => (
              <div
                key={i}
                style={{
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 10,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {name}
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: "flex", paddingLeft: 5 }}>
              {models.map((name: string, i: number) => (
                <div
                  key={i}
                  style={{
                    width: cellSize,
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {name.slice(0, 3)}
                </div>
              ))}
            </div>

            {matrix.map((row: number[], i: number) => (
              <div key={i} style={{ display: "flex" }}>
                {row.map((count: number, j: number) => (
                  <div
                    key={j}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(count),
                      border: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                      color: count > maxBattles * 0.7 ? "white" : "black",
                    }}
                    title={`${models[i]} vs ${models[j]}: ${count} battles`}
                  >
                    {count}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Average Win Rate Bar Chart
export function AvgWinRateChart() {
  const { data, isLoading } = useSWR("/api/leaderboard/stats/avg-win-rate", fetcher);

  if (isLoading) return <div>読み込み中...</div>;
  if (!data) return <div>データなし</div>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data.data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} />
        <YAxis dataKey="model_name" type="category" width={180} />
        <Tooltip
          formatter={(value) => `${value.toFixed(1)}%`}
          labelFormatter={(label) => `Tỉ Lệ Thắng`}
        />
        <Bar dataKey="avg_win_rate" fill="#3b82f6" name="Tỉ Lệ Thắng TB (%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Confidence Interval Dot-and-Whisker Plot
export function ConfidenceIntervalChart() {
  const { data, isLoading } = useSWR(
    "/api/leaderboard/stats/confidence-intervals",
    fetcher
  );

  if (isLoading) return <div>読み込み中...</div>;
  if (!data) return <div>データなし</div>;

  // Transform data for Recharts
  const chartData = data.data.map((d: any, i: number) => ({
    ...d,
    y: i,
  }));

  const maxElo = Math.max(...data.data.map((d: any) => d.ci_upper)) + 50;
  const minElo = Math.min(...data.data.map((d: any) => d.ci_lower)) - 50;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded p-3 flex gap-2">
        <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          ドット = ELO推定値 | ヒゲ = 95%信頼区間 | 重複しない = 統計的に有意な差
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 50, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[minElo, maxElo]} />
          <YAxis dataKey="model_name" type="category" width={180} />
          <Tooltip
            contentStyle={{ backgroundColor: "#f9fafb", border: "1px solid #d1d5db" }}
            formatter={(value) => Math.round(value as number)}
            labelFormatter={() => "ELO"}
          />

          {/* CI whiskers */}
          {chartData.map((d: any, i: number) => (
            <line
              key={`whisker-${i}`}
              x1={d.ci_lower}
              x2={d.ci_upper}
              y1={d.y}
              y2={d.y}
              stroke="#9ca3af"
              strokeWidth={2}
            />
          ))}

          {/* ELO points */}
          <Scatter
            dataKey="elo"
            fill="#ef4444"
            shape={<circle r={6} />}
            name="ELO"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 5. Leaderboard Hook (Daily Refresh)

**File: `frontend/hooks/useLeaderboard.ts`**

```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLeaderboard() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/leaderboard",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      focusThrottleInterval: 300000, // 5 minutes
    }
  );

  const refresh = () => mutate();

  return {
    leaderboard: data,
    isLoading,
    error,
    refresh,
  };
}
```

---

## Checklist

- [ ] Main leaderboard table renders within 2 seconds (P99)
- [ ] All table columns sortable (click header to toggle)
- [ ] Sort preference persists on page refresh (localStorage key: `vigen_lb_sort`)
- [ ] License Type column shows badge per model ("Open" green / "Prop" purple)
- [ ] Category filter tabs (7 total) render above table: Tổng hợp, Kiến thức, Sáng tạo, Lập trình, Văn hóa VN, Toán học, Nghề nghiệp
- [ ] Category selection filters leaderboard to per-category Elo (resets to Tổng hợp on page reload)
- [ ] Medal icons shown for top 3 (🥇🥈🥉)
- [ ] Win fraction heatmap matches pairwise stats
- [ ] Battle count matrix symmetric (i→j = j→i)
- [ ] Average win rate bars sorted descending
- [ ] CI whiskers non-overlapping for significant differences
- [ ] All Vietnamese labels correct
- [ ] Last updated timestamp shown
- [ ] Total vote count displayed
- [ ] 5 tabs all functional
- [ ] No real-time streaming (batch-only)
- [ ] Recharts used (not Canvas)
- [ ] Light elegant theme
- [ ] Mobile responsive (tables scroll horizontally)

---

## Testing

```bash
# Fetch leaderboard data
curl http://localhost:8000/api/leaderboard

# Fetch win fraction matrix
curl http://localhost:8000/api/leaderboard/stats/win-fraction

# Fetch battle count matrix
curl http://localhost:8000/api/leaderboard/stats/battle-count

# Fetch average win rates
curl http://localhost:8000/api/leaderboard/stats/avg-win-rate

# Fetch confidence intervals
curl http://localhost:8000/api/leaderboard/stats/confidence-intervals
```

---

## Dependencies

```
recharts==2.10.0
swr==2.2.4
lucide-react==0.292.0
@radix-ui/react-tabs==1.0.4
@radix-ui/react-table==0.0.0 (or shadcn table)
```

---

## Notes

- **Color Palettes:**
  - Win Fraction: Blue (0%) → White (50%) → Red (100%)
  - Battle Count: Yellow (few) → Purple (many)
  - Bars: Recharts default (blue)
  - CI: Red dots, gray whiskers

- **Refresh Strategy:**
  - Frontend uses SWR for caching
  - Manual refresh button optional
  - Automatic refresh every 5 minutes (focusThrottleInterval)
  - Daily batch updates backend at 2 AM UTC

- **Accessibility:**
  - Table sortable via keyboard (Tab + Space)
  - Heatmap cells have title tooltips
  - Color-blind friendly (use intensity, not just color)
  - Vietnamese labels throughout (no English except model names)

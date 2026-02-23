"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const TradeFlightLayout = dynamic(
  () => import("./TradeFlightLayout"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
          <p className="text-sm font-medium">
            TradeFlight is loading...
          </p>
        </div>
      </div>
    ),
  }
)

export default function TradeFlightClient() {
  return <TradeFlightLayout />
}
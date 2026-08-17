"use client";

import { PizzaOrderTable } from "./components/pizza-order-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type React from "react";

export default function POS() {
  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader className="bg-opacity-75 bg-gray-600 rounded-xl">
          <CardTitle className="text-2xl">Pizza POS</CardTitle>
          <CardDescription className="text-lg">Manage pizza orders</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PizzaOrderTable />
        </CardContent>
      </Card>
    </div>
  );
}

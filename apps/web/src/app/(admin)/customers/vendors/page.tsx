"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { text } from "@/constants/text";

const TRADES = ["Gates", "Grading", "Water", "Other"];

export default function VendorsPage() {
  const { propertyId, properties } = useApp();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["vendors", propertyId],
    queryFn: () => endpoints.vendors(propertyId),
  });
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]);
  const [phone, setPhone] = useState("");
  const [yard, setYard] = useState(propertyId === "all" ? properties[0]?.id ?? "" : propertyId);
  const [job, setJob] = useState("");
  const save = useMutation({
    mutationFn: () => endpoints.saveVendor({ name: name.trim(), trade, phone: phone.trim(), propertyId: yard, job: job.trim() }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setJob("");
      void queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });

  return (
    <PageTransition>
      <PageHeader title={text.admin.vendors} subtitle={text.admin.vendorHint} />
      <Card interactive={false} className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Input placeholder={text.admin.vendorName} value={name} onChange={(e) => setName(e.target.value)} />
          <SelectMenu ariaLabel={text.admin.vendorTrade} value={trade} onChange={setTrade} options={TRADES.map((item) => ({ value: item, label: item }))} />
          <Input placeholder={text.admin.vendorPhone} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <SelectMenu
            ariaLabel={text.admin.vendorYard}
            value={yard}
            onChange={setYard}
            options={properties.map((property) => ({ value: property.id, label: property.name }))}
          />
          <Input className="sm:col-span-2" placeholder={text.admin.vendorJob} value={job} onChange={(e) => setJob(e.target.value)} />
          <Button className="w-fit" disabled={!name.trim() || !job.trim() || !yard || save.isPending} onClick={() => save.mutate()}>
            {text.admin.vendorAdd}
          </Button>
        </CardBody>
      </Card>
      {isPending && !data ? (
        <Skeleton className="h-24" />
      ) : data?.length ? (
        <div className="grid gap-3">
          {data.map((vendor) => {
            const yardName = properties.find((property) => property.id === vendor.propertyId)?.name ?? vendor.propertyId;
            return (
              <Card key={vendor.id} interactive={false}>
                <CardBody className="space-y-1">
                  <p className="font-semibold">{vendor.name} · {vendor.trade}</p>
                  <p className="text-sm text-[var(--muted)]">{yardName}{vendor.phone ? ` · ${vendor.phone}` : ""}</p>
                  <p className="text-sm">{vendor.job}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{text.admin.vendorEmpty}</p>
      )}
    </PageTransition>
  );
}

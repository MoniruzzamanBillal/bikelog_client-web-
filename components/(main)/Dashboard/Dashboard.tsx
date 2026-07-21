"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import { useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useState } from "react";
import BikeCard from "../Bike/BikeCard";
import BikeFormModal from "../Bike/BikeFormModal";
import { TBike } from "../Bike/type/bike.types";

const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useFetchData<TBike[]>(["bikes"], "/bikes");
  const bikes = data?.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">My Bikes</h1>
        <PrimaryButton onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Add Bike
        </PrimaryButton>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : bikes.length === 0 ? (
        <p className="text-sm text-surface-text">
          No bikes yet. Add your first bike to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bikes.map((bike) => (
            <BikeCard key={bike._id} bike={bike} />
          ))}
        </div>
      )}

      <BikeFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default Dashboard;

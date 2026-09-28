"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { Bike, Plus } from "lucide-react";
import { useState } from "react";
import BikeCard from "../Bike/BikeCard";
import BikeFormModal from "../Bike/BikeFormModal";
import { TBike } from "../Bike/type/bike.types";

const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useFetchData<TBike[]>(
    ["bikes"],
    "/bikes",
  );
  const bikes = data?.data ?? [];

  const addButton = (
    <PrimaryButton onClick={() => setModalOpen(true)}>
      <Plus className="size-4" />
      Add bike
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PageHeader
        title="My bikes"
        crumbs={[{ label: "Dashboard" }]}
        description={
          <span className="lg:hidden">
            {!isLoading && bikes?.length > 0
              ? `${bikes?.length} bike${bikes?.length === 1 ? "" : "s"}`
              : ""}
          </span>
        }
        actions={addButton}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel flex flex-col gap-3 p-4 lg:p-[18px]">
              <Skeleton className="h-4 w-[55%]" />
              <Skeleton className="h-3 w-[40%]" />
              <Skeleton className="h-7 w-[70%]" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load your bikes"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : bikes?.length === 0 ? (
        <StateCard
          icon={Bike}
          title="No bikes yet"
          message="Add your first bike to start logging fuel fill-ups, service history and spending."
          action={addButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {bikes?.map((bike, i) => (
            <BikeCard key={bike?._id} bike={bike} highlight={i === 0} />
          ))}
        </div>
      )}

      {modalOpen && (
        <BikeFormModal open onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;

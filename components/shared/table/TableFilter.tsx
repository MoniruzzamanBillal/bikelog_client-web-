"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersVertical, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export type TTableFilterOption = {
  label: string;
  value: string;
};

export type TTableFilterGroup = {
  key: string;
  label: string;
  options: TTableFilterOption[];
};

export type TTableFilterPopoverProps = {
  filters: TTableFilterGroup[];
  value: Record<string, string>;
  onChange: (val: Record<string, string>) => void;
};

export default function TableFilter({
  filters,
  value,
  onChange,
}: TTableFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  const [accordionValue, setAccordionValue] = useState<string>(
    filters.length > 0 ? filters[0].key : "",
  );

  // const handleValueChange = (
  //   groupKey: string,
  //   optionValue: string,
  //   checked: boolean,
  // ) => {
  //   if (checked) {
  //     onChange({
  //       ...value,
  //       [groupKey]: optionValue,
  //     });
  //   } else {
  //     if (value[groupKey] === optionValue) {
  //       onChange({
  //         ...value,
  //         [groupKey]: "",
  //       });
  //     }
  //   }
  // };

  const handleValueChange = (
    groupKey: string,
    optionValue: string,
    checked: boolean,
  ) => {
    if (checked) {
      onChange({
        ...value,
        [groupKey]: optionValue,
      });
    } else {
      const updated = { ...value };
      delete updated[groupKey];
      onChange(updated);
    }
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="bg-surface-secondary border border-surface-border py-2.5 px-3 rounded-[8px] flex items-center gap-x-2 cursor-pointer">
        <div className="   ">
          <SlidersVertical className=" text-surface-text " />
        </div>
        <span className="font-semibold text-[0.875rem] text-surface-text ">
          Filter
        </span>
      </PopoverTrigger>

      <PopoverContent className="p-5 space-y-4 w-[300px] bg-surface-popover ">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="font-semibold text-[1rem] text-surface-text">
            Filters
          </h1>

          <div
            onClick={handleReset}
            className="flex items-center gap-x-1 text-surface-text-muted cursor-pointer"
          >
            <X size={16} />
            <span className="border-b border-surface-border font-bold text-[14px]">
              Reset
            </span>
          </div>
        </div>

        {/* Dynamic Accordion */}
        <Accordion
          type="single"
          collapsible
          className="space-y-4"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          {filters.map((group) => (
            <AccordionItem
              key={group.key}
              value={group.key}
              className="border border-table-border   rounded-[8px] overflow-hidden "
            >
              <AccordionTrigger className="bg-table-border text-neutral-100 py-2.5 px-3 font-medium text-[14px] rounded-none ">
                {group.label}
              </AccordionTrigger>

              <AccordionContent className="p-3 space-y-4 border-b  border-table-border  rounded-b-[8px]  ">
                {group.options.map((option) => {
                  // const isChecked =
                  //   value[group.key]?.includes(option.value) ?? false;

                  const isChecked = value[group.key] === option.value;

                  return (
                    <div
                      key={option.value}
                      className="flex items-center gap-x-2  "
                    >
                      <Checkbox
                        className=" dark:border-neutral-400  dark:data-[state=checked]:bg-primary-500 dark:data-[state=checked]:border-neutral-300 dark:data-[state=checked]:text-neutral-100 "
                        id={`${group.key}-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleValueChange(group.key, option.value, !!checked)
                        }
                      />

                      <label
                        htmlFor={`${group.key}-${option.value}`}
                        className="  text-[0.875rem] leading-5.25 font-medium cursor-pointer text-neutral-600 dark:text-neutral-200 "
                      >
                        {option.label}
                      </label>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-x-3 pt-4">
          <Button
            type="button"
            onClick={() => {
              handleReset();
              setOpen(false);
            }}
            className=" cursor-pointer border border-surface-border text-surface-text p-3 font-semibold text-[0.875rem] leading-5.25 rounded-[8px] bg-transparent hover:bg-transparent  "
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            className="  cursor-pointer border border-primary-600  bg-primary-500 hover:bg-primary-600 p-3 text-[0.875rem] leading-5.25 rounded-[8px] font-semibold  text-neutral-100"
          >
            Apply Filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// <Popover open={open} onOpenChange={setOpen}>
//     <PopoverTrigger className="bg-surface-secondary border border-surface-border py-2.5 px-3 rounded-[8px] flex items-center gap-x-2 cursor-pointer">
//       <div className="   ">
//         <SlidersVertical className=" text-surface-text " />
//       </div>
//       <span className="font-semibold text-[0.875rem] text-surface-text ">
//         Filter
//       </span>
//     </PopoverTrigger>

//     <PopoverContent className="p-5 space-y-4 w-[300px] bg-surface-popover ">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="font-semibold text-[1rem] text-surface-text">
//           Filters
//         </h1>

//         <div
//           onClick={handleReset}
//           className="flex items-center gap-x-1 text-surface-text-muted cursor-pointer"
//         >
//           <X size={16} />
//           <span className="border-b border-surface-border font-bold text-[14px]">
//             Reset
//           </span>
//         </div>
//       </div>

//       {/* Dynamic Accordion */}
//       <Accordion
//         type="single"
//         collapsible
//         className="space-y-4"
//         value={accordionValue}
//         onValueChange={setAccordionValue}
//       >
//         {filters.map((group) => (
//           <AccordionItem
//             key={group.key}
//             value={group.key}
//             className="border border-table-border rounded-[8px] overflow-hidden"
//           >
//             <AccordionTrigger className="bg-surface-secondary text-surface-text py-2.5 px-3 font-medium text-[14px] rounded-none">
//               {group.label}
//             </AccordionTrigger>

//             <AccordionContent className="p-3 space-y-4 border-b  border-table-border  rounded-b-[8px]  ">
//               {group.options.map((option) => {
//                 const isChecked =
//                   value[group.key]?.includes(option.value) ?? false;

//                 return (
//                   <div
//                     key={option.value}
//                     className="flex items-center gap-x-2  "
//                   >
//                     <Checkbox
//                       className=" border-surface-border text-surface-text data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground "
//                       id={`${group.key}-${option.value}`}
//                       checked={isChecked}
//                       onCheckedChange={(checked) =>
//                         handleValueChange(group.key, option.value, !!checked)
//                       }
//                     />

//                     <label
//                       htmlFor={`${group.key}-${option.value}`}
//                       className="  text-[0.875rem] leading-5.25 font-medium cursor-pointer text-surface-text "
//                     >
//                       {option.label}
//                     </label>
//                   </div>
//                 );
//               })}
//             </AccordionContent>
//           </AccordionItem>
//         ))}
//       </Accordion>

//       {/* Footer Buttons */}
//       <div className="flex justify-end gap-x-3 pt-4">
//         <Button
//           type="button"
//           onClick={() => {
//             handleReset();
//             setOpen(false);
//           }}
//           className=" cursor-pointer border border-surface-border text-surface-text p-3 font-semibold text-[0.875rem] leading-5.25 rounded-[8px] bg-transparent hover:bg-transparent  "
//         >
//           Cancel
//         </Button>

//         <Button
//           type="button"
//           onClick={() => {
//             setOpen(false);
//           }}
//           className="  cursor-pointer border border-primary-600  bg-primary-500 hover:bg-primary-600 p-3 text-[0.875rem] leading-5.25 rounded-[8px] font-semibold  text-neutral-100"
//         >
//           Apply Filter
//         </Button>
//       </div>
//     </PopoverContent>
//   </Popover>

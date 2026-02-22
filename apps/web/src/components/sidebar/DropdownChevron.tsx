import SFIcon from "@bradleyhodges/sfsymbols-react";
import { sfChevronRight } from "@bradleyhodges/sfsymbols";
import { motion } from "motion/react";

export const DropdownChevron = ({ isExpanded }: { isExpanded: boolean }) => {
  return (
    <motion.div
      initial={false}
      animate={{ rotate: isExpanded ? 90 : 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "inline-flex" }}
    >
      <SFIcon weight={2} icon={sfChevronRight} size={8} />
    </motion.div>
  );
};

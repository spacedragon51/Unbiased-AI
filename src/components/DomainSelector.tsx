import { useTranslation } from "react-i18next";
import { Domain, domains } from "@/data/biasData";

interface Props {
  selected: Domain;
  onSelect: (d: Domain) => void;
}

const domainList = Object.values(domains);

export default function DomainSelector({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3">
      {domainList.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            selected === d.id
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-secondary text-secondary-foreground border border-border hover:border-primary/20 hover:bg-secondary/80"
          }`}
        >
          <span className="text-lg">{d.icon}</span>
          <span>{t(`domains.${d.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

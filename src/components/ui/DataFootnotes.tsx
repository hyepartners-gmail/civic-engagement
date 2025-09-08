interface DataFootnotesProps {
  notes: string[];
}

export default function DataFootnotes({ notes }: DataFootnotesProps) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="space-y-1">
      {notes.map((note, index) => (
        <p key={index}>{note}</p>
      ))}
    </div>
  );
}
import GroupCard from './GroupCard.jsx';

export default function GroupList({ groups, onOpen }) {
  if (groups.length === 0) {
    return (
      <div className="empty card">
        <h2>No rides yet 🥚</h2>
        <p>
          Post one above — fill out your trip and we'll show you matching
          groups and people before you commit.
        </p>
      </div>
    );
  }
  const sorted = [...groups].sort((a, b) => a.avgTime - b.avgTime);
  return (
    <div className="group-list">
      <h2>Existing ride groups</h2>
      {sorted.map((g) => (
        <GroupCard key={g.id} group={g} onOpen={onOpen} />
      ))}
    </div>
  );
}

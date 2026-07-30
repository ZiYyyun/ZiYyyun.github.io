type NoteStatusProps = {
	count: number;
};

export default function NoteStatus({ count }: NoteStatusProps) {
	return (
		<button className="note-status" type="button" onClick={() => alert('Astro + React is ready.')}>
			<span>{count}</span>
			篇笔记已接入
		</button>
	);
}

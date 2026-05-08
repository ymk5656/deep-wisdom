"use client";

const TAG_STYLES: Record<string, string> = {
  "[공감]": "text-green-600",
  "[반영]": "text-blue-500",
  "[탐색]": "text-cyan-600",
  "[알아차림]": "text-yellow-600",
  "[통찰]": "text-purple-600",
};

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === "user";
  const isCrisis = content.includes("1577-0199");

  let tag = "";
  let body = content;
  for (const t of Object.keys(TAG_STYLES)) {
    if (content.startsWith(t)) {
      tag = t;
      body = content.slice(t.length).trimStart();
      break;
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className={`max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
        isCrisis ? "bg-red-50 border border-red-200 text-red-900" : "bg-white text-gray-800"
      }`}>
        {tag && <span className={`text-xs font-semibold mr-1 ${TAG_STYLES[tag]}`}>{tag}</span>}
        {body}
        {streaming && <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />}
      </div>
    </div>
  );
}

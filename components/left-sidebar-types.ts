export type SidebarChapter = {
  id: string;
  title: string;
  sortKey: string;
  wordCount?: number;
  scenes: SidebarScene[];
};

export type SidebarScene = {
  id: string;
  title: string;
  sortKey: string;
  wordCount?: number;
  order: number;
};

export type SidebarBook = {
  id: string;
  title: string;
  sortKey: string;
  chapters: SidebarChapter[];
};

export type EditableItemType = "book" | "chapter" | "section";

export type EditableItem = {
  type: EditableItemType;
  id: string;
  title: string;
};

export type SidebarModalState = {
  type: "book" | "chapter" | "section";
  parentId: string;
  sortKey: string;
  order?: number;
};

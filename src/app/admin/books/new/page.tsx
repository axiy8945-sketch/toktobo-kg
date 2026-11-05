import { getCategories } from "@/lib/data";
import { BookForm } from "../BookForm";

export default async function NewBook() {
  const cats = await getCategories();
  return <BookForm cats={cats} book={null} />;
}

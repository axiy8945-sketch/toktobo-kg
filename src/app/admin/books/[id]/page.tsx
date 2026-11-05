import { notFound } from "next/navigation";
import { getBook, getCategories } from "@/lib/data";
import { BookForm } from "../BookForm";

export default async function EditBook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [book, cats] = await Promise.all([getBook(id), getCategories()]);
  if (!book) notFound();
  return <BookForm cats={cats} book={book} />;
}

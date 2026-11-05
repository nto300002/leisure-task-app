import { administrator } from "../lib/admin";
import Leisure from "./leisure";
import Journal from "./journal/page";
export const dynamic = "force-dynamic";
export default async function Page() {
  return (await administrator()) ? <Leisure /> : <Journal />;
}

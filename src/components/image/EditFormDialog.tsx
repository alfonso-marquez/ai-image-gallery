// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@/utils/supabase/client";
// import { Button } from "@/components/ui/button";

// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { z } from "zod";
// import { useForm } from "react-hook-form";
// import { Pencil } from "lucide-react";
// import { Album } from "./types";
// import { toast } from "sonner";
// import { Spinner } from "../ui/spinner";
// import { useRouter } from "next/navigation";

// interface EditAlbumProps {
//   album: Album;
//   onAlbumEdit: (album: Album) => void;
// }

// export default function EditFormDialog({ album, onAlbumEdit }: EditAlbumProps) {
//   const [loading, setLoading] = useState(false);
//   const [open, setOpen] = useState(false);
//   const router = useRouter();

//   const formSchema = z.object({
//     name: z.string().min(1, "Name must be at least 1 character."),
//     description: z
//       .string()
//       .max(500, "Description must be at most 500 characters."),
//   });

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: album.name || "",
//       description: album.description || "",
//     },
//     shouldFocusError: false, // Disable automatic focus on error
//     mode: "onSubmit", // avoids premature validation
//     shouldUnregister: false, // keep values after unmount
//   });

//   const handleUpdate = async (values: z.infer<typeof formSchema>) => {
//     setLoading(true);

//     const supabase = createClient();
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();

//     try {
//       const res = await fetch("/api/albums", {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           id: album.id,
//           name: values.name,
//           description: values.description,
//           user_id: user?.id,
//         }),
//       });
//       const updatedAlbum = await res.json();

//       onAlbumEdit({ ...updatedAlbum, photos: updatedAlbum.photos || [] });
//       toast.success("Success!", {
//         description: "Your album has been updated successfully.",
//       });
//       router.refresh();
//     } catch {
//       toast.error("Album Update failed. Please contact support.");
//     } finally {
//       setLoading(false);
//       setOpen(false);
//     }
//   };

//   useEffect(() => {
//     const el = document.getElementById("name") as HTMLInputElement | null;
//     if (el) el.selectionStart = el.selectionEnd = el.value.length;
//   }, []);

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button variant="outline" size="sm">
//           <Pencil />
//         </Button>
//       </DialogTrigger>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Edit Album</DialogTitle>
//           <DialogDescription>
//             Edit album details and save changes.
//           </DialogDescription>
//         </DialogHeader>
//         <Form {...form}>
//           <form
//             onSubmit={form.handleSubmit(handleUpdate)}
//             className="space-y-8"
//           >
//             <FormField
//               control={form.control}
//               name="name"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Name</FormLabel>
//                   <FormControl>
//                     <Input {...field} />
//                   </FormControl>
//                   <FormDescription>Album name</FormDescription>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />
//             <FormField
//               control={form.control}
//               name="description"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Description</FormLabel>
//                   <FormControl>
//                     <Input {...field} />
//                   </FormControl>
//                   <FormDescription>
//                     Describe your album in a few words.
//                   </FormDescription>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />
//             <Button type="submit" className="mt-4">
//               {loading ? (
//                 <>
//                   <Spinner />
//                   <span>Updating</span>
//                 </>
//               ) : (
//                 "Update"
//               )}
//             </Button>
//           </form>
//         </Form>
//       </DialogContent>
//     </Dialog>
//   );
// }

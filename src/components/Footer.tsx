import { Separator } from "./ui/separator";


export default function Footer() {
    return (
        <footer className="flex flex-col items-center justify-center w-full h-24">
            <div className="max-w-[1300px] w-full p-20">

                <Separator className="mt-8 mb-4" />
                <div >
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Alfonso Marquez
                    </p>
                </div>
            </div>
        </footer>
    );
}
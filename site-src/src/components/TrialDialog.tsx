import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrialDialog } from "@/hooks/useTrialDialog";
import { Icon } from "./Icon";

const FORMSUBMIT_ENDPOINT =
  "https://formsubmit.co/dfb814c3a0727b708d511f9d0e2ef929";
const DMG_URL =
  "https://github.com/denizaytac/ancbuddy-site/releases/download/v1.2.0/BoseControl-1.2.0.dmg";

export function TrialDialog() {
  const { open, setOpen } = useTrialDialog();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="trial-dialog">
        <DialogHeader>
          <DialogTitle>Try ANCBuddy free for 14 days</DialogTitle>
          <DialogDescription>
            Drop your email and we'll send you the DMG. No spam — unsubscribe anytime.
          </DialogDescription>
        </DialogHeader>

        <form
          action={FORMSUBMIT_ENDPOINT}
          method="POST"
          acceptCharset="UTF-8"
          className="trial-form"
        >
          <div>
            <label htmlFor="trial-name">Name</label>
            <input
              type="text"
              id="trial-name"
              name="name"
              required
              autoComplete="name"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="trial-email">Email</label>
            <input
              type="email"
              id="trial-email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <input
            type="text"
            name="_honey"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: -9999, width: 1, height: 1 }}
          />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_subject" value="New ANCBuddy Trial Signup" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_next" value={DMG_URL} />

          <button
            type="submit"
            className="btn btn-accent"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            <Icon name="bolt" size={15} />
            Get the download
          </button>
        </form>

        <p className="trial-fineprint">
          By downloading you agree to receive occasional product updates.
          <br />
          14‑day trial · then $9.99 to keep using.
        </p>
      </DialogContent>
    </Dialog>
  );
}

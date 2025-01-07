import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { createLink } from "@/client/links.ts";

const SLUG =
  /^[a-zA-Z0-9._-](([a-zA-Z0-9._-]*)|([a-zA-Z0-9._\-\/]*[a-zA-Z0-9._-]))$/;

export default function CreateVanityUrlForm() {
  const [slugError, setSlugError] = useState("");
  const [redirectToError, setRedirectToError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [lastCreatedSlug, setLastCreatedSlug] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  if (IS_BROWSER) {
    useEffect(() => {
      console.log("loading changed to ", isLoading);
    });
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();

    setSlugError("");
    setRedirectToError("");
    setTitleError("");
    setDescriptionError("");
    setGeneralError("");

    setIsLoading(true);
    const form = new FormData(event.target as HTMLFormElement);

    const slug = form.get("slug") as string;
    const redirectTo = form.get("redirect-to-vanity") as string;
    const title = form.get("title-vanity") as string;
    const description = form.get("description-vanity") as string;

    if (!SLUG.test(slug)) {
      setSlugError("Invalid slug");
    }
    try {
      new URL(redirectTo);
    } catch {
      setRedirectToError("Invalid redirect URL");
    }
    if (!title) {
      setTitleError("Title is required");
    }
    if (!description) {
      setDescriptionError("Description is required");
    }

    if (slugError || redirectToError || titleError || descriptionError) {
      console.error("validation failed");
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        setLastCreatedSlug(
          await createLink({
            type: "vanity",
            slug,
            target: redirectTo,
            title,
            description,
          }),
        );
      } catch (error) {
        console.error(error);
        setGeneralError("Something went wrong: " + error);
      } finally {
        setIsLoading(false);
      }
    })();
  }

  return (
    <form
      class="px-8 my-8 flex flex-col gap-3"
      onSubmit={submit}
    >
      <h2 class="text-3xl font-bold">Create Vanity URL Form</h2>

      <label htmlFor="slug" class="form-control w-full">
        <div>
          <span className="label-text">Slug</span>
        </div>
        <input
          type="text"
          required
          id="slug"
          name="slug"
          placeholder="my-vanity-url"
          class="input input-bordered w-full mt-2"
          disabled={isLoading}
        />
        {slugError && <div class="text-xs text-error">{slugError}</div>}
      </label>

      <label htmlFor="redirect-to-vanity" class="form-control w-full">
        <div>
          <span className="label-text">Redirects to</span>
        </div>
        <input
          type="text"
          required
          id="redirect-to-vanity"
          name="redirect-to-vanity"
          placeholder="https://example.com"
          class="input input-bordered w-full mt-2"
          disabled={isLoading}
        />
        {redirectToError && (
          <div class="text-xs text-error">{redirectToError}</div>
        )}
      </label>

      <label htmlFor="title-vanity" class="form-control w-full">
        <div>
          <span className="label-text">Title</span>
        </div>
        <input
          type="text"
          required
          id="title-vanity"
          name="title-vanity"
          placeholder="My Vanity URL"
          class="input input-bordered w-full mt-2"
          disabled={isLoading}
        />
        {titleError && <div class="text-xs text-error">{titleError}</div>}
      </label>

      <label htmlFor="description-vanity" class="form-control w-full">
        <div>
          <span className="label-text">Description</span>
        </div>
        <textarea
          required
          id="description-vanity"
          name="description-vanity"
          placeholder="This is a description"
          class="textarea textarea-bordered w-full mt-2"
          disabled={isLoading}
        />
        {descriptionError && (
          <div class="text-xs text-error">{descriptionError}</div>
        )}
      </label>

      <button
        class="btn btn-primary"
        disabled={isLoading}
      >
        <span class={isLoading ? "loading" : ""} />
        <span class={isLoading ? "hidden" : ""}>Create</span>
      </button>
      {generalError && <div class="text-xs text-error">{generalError}</div>}
      {lastCreatedSlug && (
        <div class="text-xs text-success">
          Created slug: {lastCreatedSlug}
        </div>
      )}
    </form>
  );
}

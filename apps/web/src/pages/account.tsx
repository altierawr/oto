import { Button, Input, Loader, Spacer } from "@awlt/design";
import { IconExclamationMark } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";

import useCurrentUser from "../hooks/useCurrentUser";
import { request } from "../utils/http";

const validators = {
  password: z.string().min(8, "must be at least 8 characters long").max(72, "must be at most 72 characters long"),
};

const AccountPage = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const { user, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      password: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null);
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      const resp = await request("/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: value.password,
          newPassword: value.newPassword,
        }),
      });

      if (resp.ok) {
        navigate("/login");
        return;
      }

      const data = await resp.json();

      console.log({ data });
      console.log(resp.status);

      if (resp.status === 400) {
        setFormError("Something unexpected went wrong");
        return;
      }

      // Wrong credentials
      if (resp.status === 403) {
        setFormError("Invalid current password");
        return;
      }

      // Failed validation
      if (resp.status === 422) {
        for (const key of Object.keys(data.error)) {
          // TODO: add ts types to the response
          formApi.setFieldMeta(key as any, (prev) => ({
            ...prev,
            errorMap: {
              onSubmit: {
                message: data.error[key],
              },
            },
          }));
        }

        return;
      }

      if (resp.status >= 500) {
        setFormError("Something unexpected went wrong");
        return;
      }

      console.error("Unknown response", resp.status);
      setFormError("Something went wrong");
    },
  });

  if (isLoading) {
    return <Loader />;
  }

  if (!isLoading && !user) {
    navigate("/login");
    return;
  }

  return (
    <div className="relative grid h-dvh place-items-center bg-(--gray-1) text-(--gray-12)">
      <div className="grid min-w-[350px] content-start">
        <h1 className="text-center text-2xl font-semibold">Hello, {user.username}</h1>

        <Spacer size="2" />

        <p className="text-center text-sm text-(--gray-11)">Here you can change the password for your account</p>

        <Spacer size="8" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid content-start gap-4">
            <form.Field
              name="password"
              validators={{
                onBlur: validators.password,
              }}
              children={(field) => (
                <Input
                  type="password"
                  name={field.name}
                  placeholder="Current password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  errors={field.state.meta.errors
                    .filter((err) => err !== undefined)
                    .map((err) => `Password ${err.message}`)}
                  required
                  className="w-full"
                />
              )}
            />
            <form.Field
              name="newPassword"
              validators={{
                onBlur: validators.password,
              }}
              children={(field) => (
                <Input
                  type="password"
                  name={field.name}
                  placeholder="New password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  errors={field.state.meta.errors
                    .filter((err) => err !== undefined)
                    .map((err) => `Password ${err.message}`)}
                  required
                  className="w-full"
                />
              )}
            />
            <form.Field
              name="confirmPassword"
              validators={{
                onSubmit: ({ value, fieldApi }) => {
                  const password = fieldApi.form.getFieldValue("newPassword");
                  if (value !== password) {
                    return "Passwords do not match";
                  }
                  return undefined;
                },
              }}
              children={(field) => (
                <Input
                  type="password"
                  name={field.name}
                  placeholder="Confirm password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  errors={field.state.meta.errors}
                  required
                  className="w-full"
                />
              )}
            />

            {/* Form-level error display */}
            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-(--red-6) bg-(--red-2) px-3 py-2 text-(--red-11)">
                <div className="grid aspect-square w-[24px] place-items-center rounded-full bg-(--red-3)">
                  <IconExclamationMark size={16} stroke={1.5} />
                </div>
                <p className="text-sm">{formError}</p>
              </div>
            )}
          </div>

          <Spacer size="8" />

          <div className="grid content-start gap-8">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="solid"
                  color="blue"
                  isDisabled={!canSubmit}
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Change password
                </Button>
              )}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountPage;

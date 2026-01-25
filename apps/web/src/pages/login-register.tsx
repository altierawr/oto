import { Button, Input, Spacer } from "design";
import { Link, useSearchParams } from "react-router";
import { useLocation } from "react-router";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { IconExclamationMark } from "@tabler/icons-react";
import { z } from "zod";

const validators = {
  username: z
    .string()
    .min(3, "must be at least 3 characters long")
    .max(20, "must be at most 20 characters long"),
  password: z
    .string()
    .min(8, "must be at least 8 characters long")
    .max(72, "must be at most 72 characters long"),
  inviteCode: z.string().min(1, "is required"),
};

const LoginRegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const { pathname } = useLocation();

  const isRegister = pathname === "/register";
  const isLogin = pathname === "/login";

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      inviteCode: searchParams.get("code") || "",
    },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null);
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      if (isRegister) {
        const resp = await fetch("http://localhost:3003/v1/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: value.username,
            password: value.password,
            inviteCode: value.inviteCode,
          }),
        });

        const data = await resp.json();
        console.log({ data });

        if (resp.status === 201) {
          console.log({ data });
          return;
        }

        if (resp.status === 400) {
          setFormError("Something unexpected went wrong");
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
      }

      if (isLogin) {
        const resp = await fetch(
          "http://localhost:3003/v1/tokens/authentication",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              username: value.username,
              password: value.password,
            }),
          },
        );

        const data = await resp.json();

        // Wrong credentials
        if (resp.status === 401) {
          setFormError("Invalid username or password");
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

        if (resp.status === 201) {
          // TODO: do something with the token
          return;
        }

        console.error("Unknown response", resp.status);
        setFormError("Something went wrong");
      }
    },
  });

  useEffect(() => {
    setFormError(null);
    form.reset();
  }, [pathname]);

  return (
    <div className="h-dvh bg-(--gray-0) text-(--gray-12) relative grid place-items-center">
      <div className="min-w-[350px] grid content-start">
        <h1 className="font-semibold text-2xl text-center">
          {isRegister && "Create an account"}
          {isLogin && "Log in"}
        </h1>

        <Spacer size="2" />

        <p className="text-sm text-(--gray-11) text-center">
          {isRegister && "Enter your details below to create an account"}
          {isLogin && "Welcome back to oto!"}
        </p>

        <Spacer size="8" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 content-start">
            <div className="grid content-start gap-2">
              <form.Field
                name="username"
                validators={{
                  onBlur: validators.username,
                }}
                children={(field) => (
                  <>
                    <Input
                      type="text"
                      name={field.name}
                      placeholder="Username"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.value.trim())
                      }
                      required
                      errors={field.state.meta.errors
                        .filter((err) => err !== undefined)
                        .map((err) => `Username ${err.message}`)}
                      className="w-full"
                    />
                  </>
                )}
              />
            </div>
            <form.Field
              name="password"
              validators={{
                onBlur: validators.username,
              }}
              children={(field) => (
                <Input
                  type="password"
                  name={field.name}
                  placeholder="Password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value.trim())}
                  errors={field.state.meta.errors
                    .filter((err) => err !== undefined)
                    .map((err) => `Password ${err.message}`)}
                  required
                  className="w-full"
                />
              )}
            />
            {isRegister && (
              <form.Field
                name="confirmPassword"
                validators={{
                  onSubmit: ({ value, fieldApi }) => {
                    const password = fieldApi.form.getFieldValue("password");
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
            )}
            {isRegister && (
              <form.Field
                name="inviteCode"
                validators={{
                  onBlur: validators.inviteCode,
                }}
                children={(field) => (
                  <Input
                    type="text"
                    name={field.name}
                    placeholder="Invite code"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.trim())}
                    errors={field.state.meta.errors
                      .filter((err) => err !== undefined)
                      .map((err) => `Invite code ${err.message}`)}
                    required
                    className="w-full"
                  />
                )}
              />
            )}

            {/* Form-level error display */}
            {formError && (
              <div className="text-(--red-11) bg-(--red-2) border border-(--red-6) rounded-md px-3 py-2 flex gap-2 items-center">
                <div className="rounded-full w-[24px] aspect-square grid place-items-center bg-(--red-3)">
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
                  {isRegister && "Create account"}
                  {isLogin && "Log in"}
                </Button>
              )}
            />

            <p className="text-(--gray-11) text-sm text-center">
              <span>
                {isRegister && "Already have an account?"}
                {isLogin && "Don't have an account?"}
              </span>{" "}
              <Link
                to={isRegister ? "/login" : "/register"}
                className="text-(--blue-11)"
              >
                {isRegister && "Log in"}
                {isLogin && "Register"}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginRegisterPage;

import { Button, Input, Spacer } from "@awlt/design";
import { IconCheck, IconExclamationMark } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useLocation } from "react-router";
import { z } from "zod";

import useCurrentUser, { invalidateUserQuery } from "../hooks/useCurrentUser";
import { request } from "../utils/http";

const validators = {
  username: z.string().min(3, "must be at least 3 characters long").max(20, "must be at most 20 characters long"),
  password: z.string().min(8, "must be at least 8 characters long").max(72, "must be at most 72 characters long"),
  inviteCode: z.string().min(1, "is required"),
};

const LoginRegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const { isLoading, isStale, user } = useCurrentUser();
  const navigate = useNavigate();

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
      setFormSuccess(null);
      setFormError(null);

      if (isRegister) {
        const resp = await request("/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: value.username,
            password: value.password,
            inviteCode: value.inviteCode,
          }),
          skipRedirect: true,
        });

        const data = await resp.json();

        if (resp.status === 201) {
          setFormSuccess("Your account has been registered! You can now log in.");
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
        const resp = await request("/tokens/authentication", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: value.username,
            password: value.password,
          }),
          skipRedirect: true,
        });

        const data = await resp.json();

        if (resp.status === 201) {
          invalidateUserQuery();
          navigate("/");
          return;
        }

        // Wrong credentials
        if (resp.status === 403) {
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

        console.error("Unknown response", resp.status);
        setFormError("Something went wrong");
      }
    },
  });

  useEffect(() => {
    setFormError(null);
    form.reset();
  }, [pathname, form]);

  useEffect(() => {
    if (!isLoading && !isStale && user) {
      navigate("/");
    }
  }, [user, isLoading, isStale, navigate]);

  return (
    <div className="relative grid h-dvh place-items-center bg-(--gray-0) text-(--gray-12)">
      <div className="grid min-w-[350px] content-start">
        <h1 className="text-center text-2xl font-semibold">
          {isRegister && "Create an account"}
          {isLogin && "Log in"}
        </h1>

        <Spacer size="2" />

        <p className="text-center text-sm text-(--gray-11)">
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
          <div className="grid content-start gap-4">
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
                    onChange={(e) => field.handleChange(e.target.value.trim())}
                    required
                    errors={field.state.meta.errors
                      .filter((err) => err !== undefined)
                      .map((err) => `Username ${err.message}`)}
                    className="w-full"
                  />
                </>
              )}
            />
            <form.Field
              name="password"
              validators={{
                onBlur: validators.password,
              }}
              children={(field) => (
                <Input
                  type="password"
                  name={field.name}
                  placeholder="Password"
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
              <div className="flex items-center gap-2 rounded-md border border-(--red-6) bg-(--red-2) px-3 py-2 text-(--red-11)">
                <div className="grid aspect-square w-[24px] place-items-center rounded-full bg-(--red-3)">
                  <IconExclamationMark size={16} stroke={1.5} />
                </div>
                <p className="text-sm">{formError}</p>
              </div>
            )}

            {/* Form-level success display */}
            {formSuccess && (
              <div className="flex items-center gap-2 rounded-md border border-(--green-6) bg-(--green-2) px-3 py-2 text-(--green-11)">
                <div className="grid aspect-square w-[24px] place-items-center rounded-full bg-(--green-3)">
                  <IconCheck size={16} stroke={1.5} />
                </div>
                <p className="text-sm">{formSuccess}</p>
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

            <p className="text-center text-sm text-(--gray-11)">
              <span>
                {isRegister && "Already have an account?"}
                {isLogin && "Don't have an account?"}
              </span>{" "}
              <Link to={isRegister ? "/login" : "/register"} className="text-(--blue-11)">
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

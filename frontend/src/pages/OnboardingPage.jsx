import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { completeOnboarding } from "../lib/api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LoaderIcon, MapPinIcon, BriefcaseMedicalIcon, ShuffleIcon } from "lucide-react";
import { LANGUAGES, SEX } from "../constants";
import { CameraIcon } from "@heroicons/react/24/outline";

const OnboardingPage = () => {
    const { authUser } = useAuthUser();
    const queryClient = useQueryClient();

    const [formState, setFormState] = useState({
    firstName: authUser?.firstName || "",
    lastName: authUser?.lastName || "",
    sex: authUser?.sex || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },

    onError: (error) => {
        console.error("Onboarding error:", error);
        const message =
        error?.response?.data?.message ||
        error?.message ||
        "An unexpected error occurred";
        toast.error(message);
        // toast.error(error.response.data.message);
    },
  });

    const handleSubmit = (e) => {
        e.preventDefault();
        onboardingMutation(formState);
    }

    const handleRandomAvatar = () => {
        const idx = Math.floor(Math.random() * 100) + 1; // 1-100 included
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

        setFormState({ ...formState, profilePic: randomAvatar });
        toast.success("Random profile picture generated!");
    };

    return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="card bg-base-200 w-full max-w-3xl shadow-xl">
        <div className="card-body p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">Complete Your Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PROFILE PIC CONTAINER */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* IMAGE PREVIEW */}
              <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CameraIcon className="size-12 text-base-content opacity-40" />
                  </div>
                )}
              </div>

              {/* Generate Random Avatar BTN */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleRandomAvatar} className="btn btn-primary">
                  <ShuffleIcon className="size-4 mr-2" />
                  Generate Random Avatar
                </button>
              </div>
            </div>

            {/* FULL NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
              <label className="label">
                <span className="label-text">First Name</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formState.firstName}
                onChange={(e) => setFormState({ ...formState, firstName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Your first name"
              />
            </div>

            <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formState.lastName}
                onChange={(e) => setFormState({ ...formState, lastName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Your last name"
              />
            </div>
            </div>
            
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date of Birth</span>
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formState.birthDate}
                  onChange={(e) => setFormState({ ...formState, birthDate: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="Your date of birth"
                />  
              </div>
            {/* BIO */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                name="bio"
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className="textarea textarea-bordered h-24"
                placeholder="Tell us about your background"
              />
            </div>

            {/* LANGUAGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NATIVE LANGUAGE */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Language</span>
                </label>
                <select
                  name="nativeLanguage"
                  value={formState.nativeLanguage}
                  onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">Select your language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`native-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* SEX */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Sex</span>
                </label>
                <select
                  name="sex"
                  value={formState.sex}
                  onChange={(e) => setFormState({ ...formState, sex: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">Select your appropriate sex</option>
                  {SEX.map((lang) => (
                    <option key={`sex-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LOCATION */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Location</span>
              </label>
              <div className="relative">
                <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                <input
                  type="text"
                  name="location"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  className="input input-bordered w-full pl-10"
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}

            <button className="btn btn-primary w-full" disabled={isPending} type="submit">
              {!isPending ? (
                <>
                  <BriefcaseMedicalIcon className="size-5 mr-2" />
                  Complete Onboarding
                </>
              ) : (
                <>
                  <LoaderIcon className="animate-spin size-5 mr-2" />
                  Onboarding...
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
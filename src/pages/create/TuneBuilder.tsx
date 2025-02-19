
import React, { useCallback } from "react";
import { extractVideoId, fmtMSS } from "packages/looper/helpers";
import YouTube from 'react-youtube'
import ReactSlider from "react-slider";
import debounce from 'lodash.debounce'
import SpeedDropDown from "packages/builder/components/SpeedDropDown";
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, PlayPauseIcon } from "@heroicons/react/16/solid";
import { useLooperStore } from "packages/looper/store";
import { useYouTubePlayer } from "packages/looper/useYoutubePlayer";
import { useTuneBuilderStore } from "packages/builder/store";
// import RepeatDropDown from "packages/builder/components/RepeatDropDown";
import { PhraseVisualizer } from "packages/builder/components/PhraseVisualizer";
import clsx from "clsx";
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { motion } from "framer-motion";
import Instructions from "packages/builder/components/Instructions";
import { toast, ToastContainer, Bounce } from 'react-toastify'
import { dataDecompress, getBuilderUrl, getPlayerUrl } from "packages/sharing/conversion";
import { useRouter } from "next/router";
import BuilderHeader from "packages/builder/components/BuilderHeader";
import DangerDialog from "packages/misc/DangerDialog";
import Header from "packages/header/Header";
import { ArrowUturnLeftIcon } from "@heroicons/react/16/solid"
export default function CreateTune() {
    const sliderValues = useLooperStore((state) => state.sliderValues);
    const setSliderValues = useLooperStore((state) => state.setSliderValues);
    const trackMin = useLooperStore((state) => state.trackMin);
    const setTrackMin = useLooperStore((state) => state.setTrackMin);
    const trackMax = useLooperStore((state) => state.trackMax);
    const setTrackMax = useLooperStore((state) => state.setTrackMax);
    const userUrl = useLooperStore((state) => state.userUrl);
    const setUserUrl = useLooperStore((state) => state.setUserUrl);
    const videoId = useLooperStore((state) => state.videoId);
    const setVideoId = useLooperStore((state) => state.setVideoId);
    const currentTime = useLooperStore((state) => state.currentTime);
    const setCurrentTime = useLooperStore((state) => state.setCurrentTime);
    const duration = useLooperStore((state) => state.duration);
    const setDuration = useLooperStore((state) => state.setDuration);
    const speed = useLooperStore((state) => state.speed);
    const setSpeed = useLooperStore((state) => state.setSpeed);
    const isZoomed = useLooperStore((state) => state.isZoomed);
    const setIsZoomed = useLooperStore((state) => state.setIsZoomed);
    const isPlaying = useLooperStore((state) => state.isPlaying);
    const setIsPlaying = useLooperStore((state) => state.setIsPlaying);
    const setPlayerReady = useLooperStore((state) => state.setPlayerReady);

    const selectedPhraseIdx = useTuneBuilderStore((state) => state.selectedPhraseIdx);
    const setSelectedPhrase = useTuneBuilderStore((state) => state.setSelectedPhrase);
    const builderVideoId = useTuneBuilderStore((state) => state.videoId);
    const setBuilderVideoId = useTuneBuilderStore((state) => state.setVideoId);
    const phrases = useTuneBuilderStore((state) => state.phrases);
    const setPhrases = useTuneBuilderStore((state) => state.setPhrases);
    const createPhrase = useTuneBuilderStore((state) => state.createPhrase);
    // const deletePhrase = useTuneBuilderStore((state) => state.deletePhrase);
    const reset = useTuneBuilderStore((state) => state.reset);



    const yt = useYouTubePlayer({
        setCurrentTime,
        setTrackMax,
        setDuration,
        setSpeed,
        getLatestState: useLooperStore.getState,
        getRestTime: undefined,
        setIsPlaying,
        setPlayerReady,
        onLoop: undefined
    })


    const router = useRouter()

    const removeGetParams = useCallback(async () => {
        await router.push({
            pathname: router.pathname,
            query: {},
        }, undefined, { shallow: true });
    }, [router])


    const playerOpts = React.useState({
        height: yt.initialBuilderSizes[1],
        width: yt.initialBuilderSizes[0],
        // playerVars: {
        //   // https://developers.google.com/youtube/player_parameters

        // },
    })
    const mssNums: string[] = React.useMemo(() => {
        const precomputedNums = []
        for (let i = 0; i <= duration; i++) {
            precomputedNums.push(fmtMSS(i))
        }
        return precomputedNums
    }, [duration])

    const zoomTrack = (start: number, end: number) => {
        const diff = end - start
        const extra = diff * 0.2
        let min = start - extra
        min = min < 0 ? 0 : min
        let max = end + extra
        max = max > duration ? duration : max
        setTrackMin(min)
        setTrackMax(max)
    }

    const unZoomTrack = () => {
        setTrackMax(duration / 10)
        setTrackMin(0)
    }

    const debouncedHandleResize = debounce(yt.handleBuilderResize, 500)

    if (typeof window !== "undefined") {
        window.addEventListener("resize", debouncedHandleResize)
    }


    const handleUrlChange = () => {
        if (userUrl.length < 24) return
        const id = extractVideoId(userUrl)
        if (id) {
            setVideoId(id)
        }
    }


    const [validUrl, setValidUrl] = React.useState<boolean | null>(null)
    const submitUrl = (url: string) => {
        const id = extractVideoId(url)
        if (id) {
            setVideoId(id)
            setBuilderVideoId(id)
            setValidUrl(true)
            return true
        } else {
            setValidUrl(false)
            return false
        }
    }

    const updatePhrases = useCallback((sliderValues: number[] = [0, duration]) => {
        if (!phrases[selectedPhraseIdx]) return
        const newPhrases = [...phrases]
        newPhrases[selectedPhraseIdx]!.startTime = sliderValues[0]!
        newPhrases[selectedPhraseIdx]!.endTime = sliderValues[1]!
        setPhrases(newPhrases)
    }, [duration, phrases, selectedPhraseIdx, setPhrases])

    const playheadPercentage = React.useMemo(() => {
        const top = currentTime - trackMin
        const bottom = trackMax - trackMin
        return (top / bottom) * 100 * 0.96
    }, [currentTime, trackMin, trackMax])

    const playToast = (message: string) => toast.success(message, {
        position: "top-right",
        autoClose: 1000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Bounce,
    });


    const playerUrl = React.useMemo(() => {
        if (!builderVideoId) return
        return getPlayerUrl({ videoId: builderVideoId, phrases: phrases })
    }, [builderVideoId, phrases])

    const builderUrl = React.useMemo(() => {
        if (!builderVideoId) return
        return getBuilderUrl({ videoId: builderVideoId, phrases: phrases })
    }, [builderVideoId, phrases])


    // danger dialog 

    const [dangerIsOpen, setDangerIsOpen] = React.useState(false)
    const [dangerIntent, setDangerIntent] = React.useState("none")

    const clearBuilder = useCallback(() => {
        reset()
    }, [reset])

    const leaveBuilder: () => void = useCallback(() => {
        void (async () => {
            await router.push('/play');
        })();
    }, [router]);

    const dangerDialogArgs = {
        title: "Leaving Creator",
        message: "Remember to copy creator and player links before leaving.",
        cta: "Leave",
        open: dangerIsOpen,
        setOpen: setDangerIsOpen,
        intent: dangerIntent,
        leave: leaveBuilder,
        clear: clearBuilder
    }
    const warn = (intent: string) => {
        setDangerIntent(intent)
        setDangerIsOpen(true)
    }

    const tryToLeave = () => {
        warn('leave')
    }

    // I don't like this as it shouldn't run when danger dialog has been used

    // React.useEffect(() => {
    //     const handleBeforeUnload = (event: { returnValue: string; }) => {
    //         const message = "You have unsaved changes. Are you sure you want to leave?";
    //         event.returnValue = message;
    //         return message;
    //     }

    //     if (builder.videoId) {
    //         window.addEventListener('beforeunload', handleBeforeUnload);
    //     }

    //     return () => {
    //         window.removeEventListener('beforeunload', handleBeforeUnload);
    //     };
    // }, [builder]);

    React.useEffect(() => {
        const data = router.query.data
        if (typeof data === 'string' && data.length > 0) {
            const res = dataDecompress(data)

            if (res === null) return
            console.log('setting stuff')
            setPhrases(res.phrases)
            setVideoId(res.videoId)
            setBuilderVideoId(res.videoId)
            setSliderValues([res.phrases[0]?.startTime ?? 0, res.phrases[0]?.endTime ?? 5])
            setSelectedPhrase(0)
            void removeGetParams()
        }
    }, [removeGetParams, router.query.data, setBuilderVideoId, setPhrases, setSelectedPhrase, setSliderValues, setVideoId])

    React.useEffect(() => {
        const url = router.query.url
        if (typeof url === 'string') {
            setUserUrl(url)
            // calling submitUrl will set videoId state automatically if url is valid.
            if (!submitUrl(url)) {
                setValidUrl(false)
                void removeGetParams()
                return
            } else {
                setValidUrl(true)
                void removeGetParams()
            }
        }
    }, [router.query])

    const handleAddPhraseClick = () => {
        const builder = useTuneBuilderStore.getState()
        const prevStart =
            builder.phrases[builder.phrases.length - 1]?.startTime ?? null;
        const prevEnd = builder.phrases[builder.phrases.length - 1]?.endTime ?? null;

        if (prevStart === null || prevEnd === null) {
            createPhrase([0, 5])
            setSliderValues([0, 5])
            return
        }

        const prevDuration = prevEnd - prevStart;
        const currentEnd = prevEnd + prevDuration;
        createPhrase([prevEnd, currentEnd])
        setSliderValues([prevEnd, currentEnd])

        if (!isZoomed) return
        zoomTrack(prevEnd, currentEnd)
    }


    return (
        <>
            {!builderVideoId ? (
                <div className="flex flex-col items-center justify-start h-screen">
                    <Header />
                    <div className="bg-slate-900 text-white border-slate-900 border-2 p-5 rounded-lg w-11/12 sm:w-1/2 md:w-1/2 flex flex-col items-center">
                        <label htmlFor="link" className="block text-sm/6 font-medium text-white ">
                            First Enter a Youtube Link
                        </label>
                        <div className="mt-2 w-full lg:w-2/3">
                            <input
                                id="link"
                                name="link"
                                type="link"
                                value={userUrl}
                                onChange={(e) => {
                                    setUserUrl(e.target.value)
                                    debounce(handleUrlChange, 500)
                                }}
                                placeholder="https://www.youtube.com/watch?v=qoPdu64kG84"
                                className={`text-center block w-full rounded-md bg-slate-200 px-3 py-1.5 font-semibold text-gray-900 outline outline-1 -outline-offset-1 outline-slate-400 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 lg:text-base ${validUrl === false && "text-red-500"}`}
                            />
                        </div>
                        <p className="p-3 text-xs text-red-500">{validUrl === false && "Please enter a valid url"}</p>
                        <button className="cursor-pointer self-end bg-slate-900 text-white p-3 rounded-2xl" onClick={() => submitUrl(userUrl)}>Next</button>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-700 flex flex-col justify-start items-center pt-0 pb-0 min-h-screen">
                    <BuilderHeader tryToLeave={tryToLeave} />
                    <div className="flex flex-col gap-5 items-center justify-center pt-4 m-0 w-full">
                        <div className="w-full flex flex-col items-center gap-5">

                            <div className="relative">
                                <YouTube loading="lazy" id="yt" className=" bg-gray-600 p-4 rounded-xl" videoId={videoId} opts={playerOpts[0]} onReady={yt.onPlayerReady} onStateChange={yt.onStateChange} />
                                <button onClick={yt.voidPlayPause} className="absolute top-0 left-0 w-full h-full z-10"></button>
                            </div>
                            <div className="justify-self-center w-full sm:w-1/2">
                                <PhraseVisualizer zoomTrack={zoomTrack} isZoomed={isZoomed} />
                            </div>
                            <div className="flex flex-col justify-center items-center gap-10 w-full sm:w-2/3 md:w-7/12 bg-slate-800 border-slate-900 border-2 p-8 rounded-3xl">
                                <div className="w-full bg-slate-600 p-5 pb-8 rounded-3xl flex relative">
                                    <ReactSlider
                                        value={sliderValues}
                                        onAfterChange={(newSliderValues) => {
                                            updatePhrases(newSliderValues)
                                            setSliderValues(newSliderValues)
                                            // voidSnapToLoop()
                                        }}
                                        className="horizontal-slider w-full"
                                        thumbClassName="bg-white p-1 cursor-pointer relative h-3"
                                        // trackClassName classes applied globals.css
                                        withTracks={true}
                                        renderThumb={(props, state) =>
                                            <div {...props}>
                                                <div className={state.index ? "absolute p-2 rounded-xl cursor-pointer text-white -bottom-12 -right-5 border-b-2 border-gray-200" : "absolute p-2 rounded-xl cursor-pointer text-white border-gray-200 bottom-5 -right-5 border-t-2"}>
                                                    <p className="select-none">{mssNums[Math.floor(state.valueNow)] ?? Math.floor(state.valueNow)}</p>
                                                </div>
                                            </div>
                                        }
                                        step={.005}
                                        min={trackMin}
                                        max={trackMax} //duration is in 10th of a second ReactSlider takes arg in seconds
                                        minDistance={.05}
                                    />
                                    {isPlaying && (
                                        <div
                                            className="absolute top-5 border-l-0 border-r-2 z-30 h-3"
                                            style={{
                                                width: `${playheadPercentage}%`,
                                                // transition: 'width 0.1s linear', // Smooth animation
                                            }}
                                        ></div>
                                    )}

                                </div>

                                <div className="flex justify-center sm:justify-between w-full items-end flex-wrap gap-8 sm:gap-3 relative">
                                    <div>
                                        <SpeedDropDown speed={speed} setSpeed={setSpeed} voidChangeSpeed={yt.voidChangeSpeed} />
                                    </div>

                                    <div className="lg:absolute lg:-translate-x-1/2 lg:-translate-y-1/2 lg:top-1/2 sm:left-1/2 flex flex-row gap-3">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => yt.voidPlayPause()} >
                                            <PlayPauseIcon className="w-12 h-12 p-1 bg-slate-900 rounded-xl text-white cursor-pointer" />
                                        </motion.button>

                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => yt.voidResetToBeginningOfLoop()} >
                                            <ArrowUturnLeftIcon className="w-12 h-12 p-1 bg-slate-900 rounded-xl text-white cursor-pointer" />
                                        </motion.button>
                                    </div>
                                    <div className="flex flex-row flex-wrap gap-3">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            className={clsx(
                                                'bg-slate-900 text-white p-3 rounded-2xl cursor-pointer',
                                                { 'border-4 border-green-500': phrases.length === 0 }
                                            )} onClick={handleAddPhraseClick}><p className="select-none">Add Phrase</p></motion.button>
                                        {/* <RepeatDropDown /> */}


                                        {isZoomed ?
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => {
                                                    setIsZoomed(false)
                                                    unZoomTrack()
                                                }}>
                                                <MagnifyingGlassMinusIcon className="w-12 h-12 bg-slate-900 rounded-xl text-white cursor-pointer" />
                                            </motion.button> :
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => {
                                                    setIsZoomed(true)
                                                    zoomTrack(sliderValues[0]!, sliderValues[1]!)
                                                }}>
                                                <MagnifyingGlassPlusIcon className="w-12 h-12 bg-slate-900 rounded-xl text-white cursor-pointer" />

                                            </motion.button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 lg:gap-20 justify-start items-center px-10 py-5 pb-10 2xl:fixed 2xl:right-0 2xl:bottom-0 2xl:p-10 2xl:bg-slate-600 2xl:rounded-3xl 2xl:rounded-br-none 2xl:rounded-tr-none 2xl:shadow-2xl">
                        <div className="flex justify-center flex-wrap gap-5 2xl:flex-col">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => warn('clear')}
                                className="self-start bg-slate-900 text-white p-3 rounded-2xl select-none">
                                Start a new tune
                            </motion.button>

                            <CopyToClipboard
                                text={playerUrl ?? ''}>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => playToast('Player link copied to clipboard 💪')}
                                    className="bg-slate-900 text-white p-3 rounded-2xl select-none">Copy player link
                                </motion.button>
                            </CopyToClipboard>

                            <CopyToClipboard
                                text={builderUrl ?? ''}>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => playToast('Creator link copied to clipboard 💪')}
                                    className="bg-slate-900 text-white p-3 rounded-2xl select-none">Copy creator link
                                </motion.button>
                            </CopyToClipboard>
                        </div>

                        <div className="block 2xl:fixed 2xl:left-0 2xl:top-0 ">
                            <Instructions />
                        </div>
                    </div>
                    <ToastContainer
                        position="top-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick={false}
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                        transition={Bounce}
                    />
                    <DangerDialog {...dangerDialogArgs} />
                </div>
            )
            }
        </>
    );
}
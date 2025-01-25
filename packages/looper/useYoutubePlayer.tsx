import { useRef, useCallback, useMemo } from "react";
import { type YouTubeEvent, type YouTubeProps } from "react-youtube";
import type { YouTubePlayer } from 'youtube-player/dist/types'
import type PlayerStates from "youtube-player/dist/constants/PlayerStates"
import { type PlayerState, usePlayerStore } from "packages/player/store";
import type { LoopState } from "./store";
import { useLooperStore } from "./store";
type UserIntent = 'player' | 'creator';
type LoopCallback = (() => void) | null;


export const useYouTubePlayer = (intent: UserIntent, onLoop: LoopCallback) => {
    const pp = usePlayerStore()
    const looper = useLooperStore()
    let setCurrentTime: (time: number) => void
    let setTrackMax: (max: number) => void | undefined
    let setDuration: (duration: number) => void
    let setSpeed: (speed: number) => void
    let getLatestState: (() => PlayerState) | (() => LoopState) | undefined
    let getRestTime: (() => PlayerState) | undefined
    let setIsPlaying: (isPlaying: boolean) => void
    // this injection needs to be done better but for now it works
    if (intent === 'player') {
        ({
            setCurrentTime,
            setDuration,
            setSpeed,
            setIsPlaying
        } = pp)
        getLatestState = usePlayerStore.getState
        getRestTime = usePlayerStore.getState
    }
    else if (intent === 'creator') {
        ({
            setCurrentTime,
            setDuration,
            setSpeed,
            setTrackMax,
            setIsPlaying
        } = looper)
        getLatestState = useLooperStore.getState
    }
    const playerRef = useRef<YouTubePlayer | null>(null);
    const pollingRef = useRef<number | null>(null)
    // const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const seekToTime = useCallback(async (timeInSeconds: number) => {
        if (playerRef.current) {
            await playerRef.current.seekTo(timeInSeconds, true);
        }
    }, []);

    const snapToLoop = async (time: number) => {
        const { sliderValues } = getLatestState!()
        let restTime = getRestTime?.().restTime
        if (restTime) restTime *= 1000
        if (!sliderValues || sliderValues[0] === 0 && sliderValues[1] === 0) return
        try {
            if (time < sliderValues[0]!) {
                await seekToTime(sliderValues[0]!)
            } else if (time > (sliderValues[1] ?? 0)) {
                if (intent === 'player' && restTime) {
                    voidPlayPause()
                    setTimeout(voidPlayPause, restTime)
                }
                if (onLoop) {
                    onLoop()
                }
                await seekToTime(sliderValues[0]!)
            }
        } catch (err) {
            console.error(err)
        }
    }
    const voidSnapToLoop = (time: number) => {
        void snapToLoop(time)
    }


    const changeSpeed = useCallback(async (speed: number) => {
        if (playerRef.current) {
            await playerRef.current.setPlaybackRate(speed)
        }
    }, [])

    const voidChangeSpeed = useCallback((speed: number) => {
        void changeSpeed(speed)
    }, [changeSpeed])

    const playPause = async () => {
        if (!playerRef.current) return
        const playerState = await playerRef.current.getPlayerState()
        const playing: PlayerStates = 1
        if (playerState === playing) {
            await playerRef.current.pauseVideo()
        } else {
            await playerRef.current.playVideo()
        }
    }

    const voidPlayPause = () => {
        void playPause()
    }

    const onStateChange = (e: YouTubeEvent<number>) => {
        const playerState: number = e.data;
        handleResize()

        const poll = () => {
            void updateTime();
            pollingRef.current = requestAnimationFrame(poll);
        };

        if (playerState === 1) {
            setIsPlaying(true)
            if (!pollingRef.current) {
                pollingRef.current = requestAnimationFrame(poll);
            }
        } else {
            setIsPlaying(false)
            if (pollingRef.current) {
                cancelAnimationFrame(pollingRef.current);
                pollingRef.current = null;
            }
        }
    };

    // using setInterval rather than requestAnimationFrame

    // const onStateChange = (e: YouTubeEvent<number>) => {
    //     const playerState: number = e.data;
    //     if (playerState === 1) {
    //         pollingRef.current = setInterval(() => {
    //             void updateTime()
    //         }, 10);
    //     } else {
    //         if (pollingRef.current) {
    //             clearInterval(pollingRef.current)
    //         }
    //     }
    // };

    // const uiTimeStateUpdate = throttle((time: number) => {
    //     setCurrentTime(time)
    //     console.log(time)
    // }, 1000)

    const updateTime = async () => {
        if (!playerRef.current) return
        const time: number = await playerRef.current.getCurrentTime();
        voidSnapToLoop(time)
        setCurrentTime(time)
    }

    const updateDuration = async () => {
        if (!playerRef.current) return
        const newDuration = await playerRef.current.getDuration()
        setDuration(newDuration * 10)
        if (setTrackMax) setTrackMax(newDuration)
    }
    const setSize = async (width: number, height: number) => {
        if (!playerRef.current) return
        await playerRef.current.setSize(width, height)
    }
    const initialSizes = useMemo(() => {
        if (typeof window === 'undefined') return [0, 0]
        const width = window.innerWidth
        let playerWidth = width / 1.5

        switch (true) {
            case width > 1280:
                playerWidth = width / 2
                break
            case width > 768:
                playerWidth = width / 1.5
                break
            default:
                playerWidth = width - 40
                break
        }
        playerWidth = playerWidth
        const playerHeight = playerWidth * (9 / 16)
        return [playerWidth - 16, playerHeight - 16]
    }, [])

    const handleResize = useCallback(() => {
        if (!window) return
        const voidSetSize = (width: number, height: number) => {
            void setSize(width, height)
        }
        const width = window.innerWidth
        let playerWidth = width / 1.5

        switch (true) {
            case width > 1280:
                playerWidth = width / 2
                break
            case width > 768:
                playerWidth = width / 1.5
                break
            default:
                playerWidth = width - 40
                break
        }
        playerWidth = playerWidth
        const playerHeight = playerWidth * (9 / 16)
        voidSetSize(playerWidth - 16, playerHeight - 16)
    }, [])

    const initialBuilderSizes = useMemo(() => {
        if (typeof window === 'undefined') return [0, 0]
        const width = window.innerWidth
        let playerWidth = width / 3

        switch (true) {
            case width > 1280:
                playerWidth = width / 2
                break
            case width > 768:
                playerWidth = width / 1.5
                break
            default:
                playerWidth = width - 40
                break
        }
        playerWidth = playerWidth
        const playerHeight = playerWidth * (9 / 16)
        return [playerWidth - 16, playerHeight - 16]
    }, [])

    const handleBuilderResize = useCallback(() => {
        if (!window) return
        const voidSetSize = (width: number, height: number) => {
            void setSize(width, height)
        }
        const width = window.innerWidth
        let playerWidth = width / 3

        switch (true) {
            case width > 1280:
                playerWidth = width / 2
                break
            case width > 768:
                playerWidth = width / 1.5
                break
            default:
                playerWidth = width - 40
                break
        }
        playerWidth = playerWidth
        const playerHeight = playerWidth * (9 / 16)
        if (playerRef.current) {
            voidSetSize(playerWidth - 16, playerHeight - 16)
        }
    }, [])

    const onPlayerReady: YouTubeProps['onReady'] = (event: { target: YouTubePlayer }) => {
        playerRef.current = event.target
        setSpeed(1)
        void updateDuration()
        handleResize()
    }

    return { voidPlayPause, onStateChange, updateTime, updateDuration, setSize, initialSizes, handleResize, initialBuilderSizes, handleBuilderResize, onPlayerReady, voidSnapToLoop, voidChangeSpeed };
};

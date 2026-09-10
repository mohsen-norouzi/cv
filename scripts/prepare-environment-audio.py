"""Create compact spatial ambience from the CC0 recordings in sounds/credits.txt.
Usage: python3 scripts/prepare-environment-audio.py /path/to/source-mp3s
"""
import array
import pathlib
import subprocess
import sys

source = pathlib.Path(sys.argv[1])
output = pathlib.Path(__file__).resolve().parents[1] / 'public/sounds'
rate = 44100
# Start, source length, overlap. The overlap joins the end back to the beginning.
clips = {'morning': (12, 36, 3), 'night': (18, 30, 3), 'ocean': (22, 45, 4), 'owl': (0, 9.725, 0)}
for name, (start, duration, overlap) in clips.items():
    original = 'crickets' if name == 'night' else name
    pcm = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(source / f'{original}.mp3'),
        '-t', str(duration), '-af', 'highpass=f=65,loudnorm=I=-22:TP=-3:LRA=11',
        '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'])
    samples = array.array('f', pcm)
    count = int(overlap * rate)
    if count:
        blend = array.array('f', (
            samples[-count+i] * (1-i/count) + samples[i] * (i/count)
            for i in range(count)))
        samples = samples[count:-count] + blend
    else:
        fade = int(.2 * rate)
        for i in range(fade):
            samples[i] *= i/fade
            samples[-1-i] *= i/fade
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(rate), '-ac', '1',
        '-i', '-', '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart',
        str(output / f'{name}.m4a')], input=samples.tobytes(), check=True)
    print(f'{name}: {len(samples)/rate:.2f}s, {(output / f"{name}.m4a").stat().st_size/1024:.0f} KiB')

"""Create browser-free 1080p editorial selects; originals are untouched."""
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# source in / source duration; all output is 30fps, normal speed.
SELECTS={
 'candy':('td-candykingdom',32,40),
 'pyramid':('td-pyramid',77,52),
 'hogwarts':('td-hogwarts',100,65),
 'marina':('td-mbs',48,48),
 'creator':('td-hogwarts',5,10),
 'reveal':('td-hogwarts',48,5),
}
for name,(source,start,duration) in SELECTS.items():
 out=ROOT/'public/media'/f'{name}.mp4'
 if out.exists() and '--force' not in sys.argv:continue
 subprocess.run(['ffmpeg','-v','error','-ss',str(start),'-i',str(ROOT/'clips'/f'{source}.mov'),'-t',str(duration),'-an','-vf','crop=2992:1622:0:312,scale=1920:1040,pad=1920:1080:0:20:color=0x0c1213,setsar=1,fps=30','-c:v','libx264','-preset','fast','-crf','18','-g','30','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(out)],check=True)
 print('Prepared',out.name,flush=True)

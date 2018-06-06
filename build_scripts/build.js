const fse = require('fs-extra'),
    path = require('path'),
    glob =require('glob'),
    frontMatter = require('front-matter'),
    marked = require('marked'),
    ejs = require('ejs');
    //md 파일위의
    //----
    //title
    //desc
    //----
    //부분을 json으로 정리해줍니다.

const srcPath = './src',
    distPath = './docs',
    configPath = require('../site.config.js');
    
// const distPath = process.env.NODE_ENV === 'production' ? '/docs' : '/public';

// docs 폴더 안에 있던 기존 파일들을 삭제 합니다. 
console.log('Cleaning docs dir...');
fse.emptyDirSync(distPath);

//src 폴더 안에 assets 파일들을 복사 합니다.
console.log('Copy src assets files...');
fse.copySync(`${srcPath}/assets`, `${distPath}/assets`);

const globFunc = new Promise ((resolve, reject) => {
    glob("**/*.md", { cwd: `${srcPath}/pages` }, (err,files) => {
        if(err) reject(err);
        resolve(files);
    });
});
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}
globFunc
    .then(  (files) => {
        const post = async () => {
            const items=[];
            await asyncForEach(files, async file => {
                const filePath = path.parse(file);
                const destPath = path.join(distPath, filePath.dir);
                await fse
                    .mkdirs(destPath)
                    .then(() => 
                        fse.readFile(`${srcPath}/pages/${file}`, 'utf-8')
                    )
                    .then(data => 
                        frontMatter(data)
                    )
                    .then(pageData => {
                        let title = pageData.attributes.title,
                            description =pageData.attributes.description,
                            date = pageData.attributes.date||Date.now(),
                            content = marked(pageData.body);
                        let layout = pageData.attributes.layout || 'post';
                        let layoutFileName = `${srcPath}/layouts/${layout}.ejs`;
                        let layoutFile = fse.readFileSync(layoutFileName, 'utf-8');
                        let completePage = ejs.render(
                            layoutFile,
                            {
                                site: configPath.site,
                                title: title,
                                date: date,
                                body: content
                            }
                        );
                        // console.log(filePath.dir);
                        items.push({
                            url:`/${filePath.dir}`,
                            title: title,
                            date: date,
                            desc: description
                        });
                        return completePage;
                    })
                    .then(str => {
                        // save the html file
                        fse.writeFile(`${destPath}/${filePath.name}.html`, str);
                    })
                    .catch(err => {
                        console.error(err);
                    });
            });
            fse.readFile(`${srcPath}/layouts/blog.ejs`,'utf-8')
                .then(layoutFile => {
                    return ejs.render(
                        layoutFile,
                        {
                            site: configPath.site,
                            item: items
                        }
                    )
                })
                .then(str=>{
                    fse.writeFile(`./docs/index.html`, str);
                })
                .catch(e => {
                    console.log(e);
                });
          
        }
        post();
    })
    .catch(err => {
        console.error(err);
    });

